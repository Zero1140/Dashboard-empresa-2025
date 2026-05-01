import socket
from typing import Dict, List, Optional, Tuple

from PyQt6.QtCore import QObject, QThread, QTimer, pyqtSignal, pyqtSlot

from catalog import load_catalog as _scan_catalog, CatalogSizeWorker
from config import save_config
from format_detector import detect_format, remote_path_for_format, GameFormat
from ftp_worker import FTPWorker, FreeSpaceWorker
from models import ConsoleInfo, ConsoleType, GameEntry, TransferJob
from queue_manager import QueueManager
from scanner import ScannerThread, ConsoleHealthChecker
from staging_manager import StagingManager
from webman import WebManClient, WebManPostWorker, PkgInstallWorker


class _ManualConnectWorker(QThread):
    found = pyqtSignal(object)    # ConsoleInfo
    not_found = pyqtSignal(str)   # ip

    def __init__(self, ip: str):
        super().__init__()
        self._ip = ip.strip()

    def run(self):
        from detector import detect_console
        console = detect_console(self._ip)
        if console:
            self.found.emit(console)
        else:
            self.not_found.emit(self._ip)


class AppController(QObject):
    _SPACE_WARNING_THRESHOLD = 0.95

    # ── signals toward UI ─────────────────────────────────────────────
    console_found     = pyqtSignal(object)             # ConsoleInfo
    console_online    = pyqtSignal(str)                # console_id
    console_offline   = pyqtSignal(str)                # console_id
    scan_started      = pyqtSignal()
    scan_finished     = pyqtSignal(int)                # n consoles

    catalog_ready     = pyqtSignal(object, list, str)  # console, games, error
    game_size_ready   = pyqtSignal(str, int)           # name, bytes
    free_space_ready  = pyqtSignal(str, float)         # console_id, gb

    transfer_progress = pyqtSignal(str, str, int, int, float)
    transfer_done     = pyqtSignal(str, str, str)
    transfer_failed   = pyqtSignal(str, str, str)
    transfer_retry    = pyqtSignal(str, str, int)
    queue_done        = pyqtSignal(str, int, int)

    hen_required      = pyqtSignal(str, bool)          # ip, has_webman
    space_warning     = pyqtSignal(str, float, float)  # console_id, needed_gb, free_gb
    pkg_guide_required = pyqtSignal(list)              # [pkg_name, ...] (no webMAN)
    status_message    = pyqtSignal(str)

    def __init__(self, config: dict, parent=None):
        super().__init__(parent)
        self.config = config
        self.consoles: Dict[str, ConsoleInfo] = {}
        self.workers: Dict[str, FTPWorker] = {}
        self.queue_manager = QueueManager()
        self.staging_manager = StagingManager()
        self._console_online: Dict[str, bool] = {}
        self._job_totals: Dict[str, int] = {}
        self._job_done_count: Dict[str, int] = {}
        self._job_registry: Dict[Tuple[str, str], TransferJob] = {}
        self._latest_eta_data: Dict[str, Tuple[int, float]] = {}
        self._free_space_cache: Dict[str, float] = {}
        self._game_size_cache: Dict[str, int] = {}
        self._batch_has_pkg: Dict[str, list] = {}
        self._webman_post_workers: Dict[str, QThread] = {}
        self._pkg_install_workers: Dict[str, QThread] = {}
        self._pending_transfer: Dict[str, Tuple[ConsoleInfo, List[TransferJob]]] = {}

        self._scan_timer = QTimer(self)
        self._scan_timer.timeout.connect(self.start_scan)
        self._scan_timer.start(config.get("scan_interval_seconds", 30) * 1000)

        self._eta_timer = QTimer(self)
        self._eta_timer.timeout.connect(self._update_eta_status)
        self._eta_timer.start(1000)

        self._health_timer = QTimer(self)
        self._health_timer.timeout.connect(self._start_health_check)
        self._health_timer.start(15_000)

    # ── public API ────────────────────────────────────────────────────

    def is_transferring(self) -> bool:
        return any(w.isRunning() for w in self.workers.values())

    def stop_all_workers(self) -> None:
        self._scan_timer.stop()
        self._eta_timer.stop()
        self._health_timer.stop()
        for w in self.workers.values():
            w.stop()
        for w in self.workers.values():
            w.wait(2000)

    def start_scan(self) -> None:
        if hasattr(self, '_scanner') and self._scanner.isRunning():
            return
        self.scan_started.emit()
        self.status_message.emit("Buscando consolas en la red local...")
        self._scanner = ScannerThread(parent=self, subnet=self.config.get("scan_subnet", ""))
        self._scanner.console_found.connect(self._on_console_found)
        self._scanner.scan_finished.connect(self._on_scan_finished)
        self._scanner.start()

    def add_console_by_ip(self, ip: str) -> None:
        self.status_message.emit(f"Conectando a {ip}...")
        worker = _ManualConnectWorker(ip)
        worker.found.connect(self._on_console_found)
        worker.not_found.connect(
            lambda failed_ip: self.status_message.emit(f"No se encontró consola en {failed_ip}.")
        )
        worker.start()
        self._manual_worker = worker

    def rename_console(self, console_id: str, new_label: str) -> None:
        console = self.consoles.get(console_id)
        if console:
            console.label = new_label

    def load_catalog(self, console: ConsoleInfo) -> None:
        old = getattr(self, "_size_worker", None)
        if old is not None and old.isRunning():
            old.size_ready.disconnect()
            old.quit()
            old.wait(1000)
        root_key = "ps3_root" if console.console_type == ConsoleType.PS3 else "xbox_root"
        games, error_msg = _scan_catalog(self.config.get(root_key, ""), console.console_type)
        self.catalog_ready.emit(console, games, error_msg)
        if games:
            worker = CatalogSizeWorker(games, self)
            worker.size_ready.connect(self._on_game_size)
            worker.start()
            self._size_worker = worker
        if self.config.get("auto_mode", False) and games and not error_msg:
            for game in games:
                self.staging_manager.add(console.console_id, game)
            self.commit_transfer(console.console_id)

    def query_free_space(self, console: ConsoleInfo) -> None:
        old = getattr(self, "_free_space_worker", None)
        if old is not None and old.isRunning():
            old.result.disconnect()
            old.quit()
            old.wait(1000)
        worker = FreeSpaceWorker(console)
        worker.result.connect(self._on_free_space_result)
        worker.start()
        self._free_space_worker = worker

    def stage_game(self, console_id: str, game: GameEntry) -> None:
        self.staging_manager.add(console_id, game)

    def unstage_game(self, console_id: str, index: int) -> None:
        self.staging_manager.remove(console_id, index)

    def get_staged(self, console_id: str) -> List[GameEntry]:
        return self.staging_manager.get(console_id)

    def commit_transfer(self, console_id: str) -> None:
        console = self.consoles.get(console_id)
        if not console:
            return
        if not self._preflight_ok(console):
            self.status_message.emit(
                f"No se pudo conectar a {console.label} ({console.ip}). "
                "Verifica que la consola esté encendida y con FTP activo."
            )
            return
        if not self._hen_ok(console):
            self.hen_required.emit(console.ip, console.webman)
            return
        self._build_and_enqueue(console_id)

    def cancel_transfer(self, console_id: str) -> None:
        worker = self.workers.get(console_id)
        if worker and worker.isRunning():
            worker.stop()
        self.queue_manager.clear(console_id)

    def retry_job(self, console_id: str, job: TransferJob) -> None:
        console = self.consoles.get(console_id)
        if not console:
            return
        self._job_done_count[console_id] = max(0, self._job_done_count.get(console_id, 0) - 1)
        self.queue_manager.add_jobs(console_id, [job])
        self._ensure_worker_running(console)

    def hen_confirmed(self, console_ip: str) -> None:
        console = self.consoles.get(console_ip)
        if not console:
            return
        if not self._hen_ok(console):
            self.status_message.emit("Transferencia cancelada: HEN no está activo.")
            return
        self._build_and_enqueue(console.console_id)

    def commit_transfer_confirmed(self, console_id: str) -> None:
        entry = self._pending_transfer.pop(console_id, None)
        if entry is None:
            return
        console, jobs = entry
        self._enqueue_jobs(console, jobs)

    def update_config(self, config: dict) -> None:
        self.config = config
        self._scan_timer.setInterval(config.get("scan_interval_seconds", 30) * 1000)
        if not save_config(config):
            self.status_message.emit("No se pudo guardar la configuracion (disco lleno o sin permisos)")

    # ── private ───────────────────────────────────────────────────────

    def _preflight_ok(self, console: ConsoleInfo) -> bool:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(2.0)
        try:
            return s.connect_ex((console.ip, 21)) == 0
        except Exception:
            return False
        finally:
            s.close()

    def _hen_ok(self, console: ConsoleInfo) -> bool:
        if console.console_type != ConsoleType.PS3:
            return True
        if console.webman:
            return WebManClient(console.ip).is_hen_active()
        from detector import verify_hen
        return verify_hen(console.ip)

    def _build_and_enqueue(self, console_id: str) -> None:
        console = self.consoles.get(console_id)
        if not console:
            return
        staged = self.staging_manager.get(console_id)
        if not staged:
            return

        jobs: List[TransferJob] = []
        for game in staged:
            if console.console_type == ConsoleType.PS3:
                try:
                    fmt = detect_format(game.local_path)
                    game.format = fmt
                    remote_base = remote_path_for_format(fmt, self.config)
                except (FileNotFoundError, ValueError) as e:
                    remote_base = self.config.get("ps3_remote_path", "/dev_hdd0/GAMES/")
                    self.status_message.emit(
                        f"Advertencia: formato desconocido para '{game.name}' — usando GAMES/ ({e})"
                    )
            else:
                remote_base = self.config.get("xbox_remote_path", "Hdd1:\\Games\\")

            if not remote_base:
                self.status_message.emit(
                    f"Ruta remota para {console.console_type.value} no configurada. "
                    "Configurala en Archivo → Configuración."
                )
                return
            jobs.append(TransferJob(game=game, remote_base_path=remote_base))

        self._batch_has_pkg[console_id] = [
            job.game.name for job in jobs if job.game.format == GameFormat.PKG
        ]

        total_bytes = sum(self._game_size_cache.get(job.game.name, 0) for job in jobs)
        free_gb = self._free_space_cache.get(console_id, -1.0)
        total_gb = total_bytes / (1024 ** 3) if total_bytes > 0 else 0.0

        if total_bytes > 0 and free_gb >= 0 and total_gb > free_gb * self._SPACE_WARNING_THRESHOLD:
            self._pending_transfer[console_id] = (console, jobs)
            self.space_warning.emit(console_id, total_gb, free_gb)
            return

        self._enqueue_jobs(console, jobs)

    def _enqueue_jobs(self, console: ConsoleInfo, jobs: List[TransferJob]) -> None:
        self.staging_manager.clear(console.console_id)
        self._job_totals[console.console_id] = len(jobs)
        self._job_done_count[console.console_id] = 0
        for job in jobs:
            self._job_registry[(console.console_id, job.game.name)] = job
        self.queue_manager.add_jobs(console.console_id, jobs)
        self._ensure_worker_running(console)
        self.status_message.emit(
            f"Iniciando carga de {len(jobs)} juego(s) en {console.label}..."
        )

    def _ensure_worker_running(self, console: ConsoleInfo) -> None:
        existing = self.workers.get(console.console_id)
        if existing and existing.isRunning():
            return
        worker = FTPWorker(
            console=console,
            queue=self.queue_manager,
            overwrite=self.config.get("overwrite_existing", False),
        )
        worker.progress.connect(self._on_progress)
        worker.job_done.connect(self._on_job_done)
        worker.job_failed.connect(self._on_job_failed)
        worker.retry_attempt.connect(self._on_retry_attempt)
        worker.queue_done.connect(self._on_queue_done)
        self.workers[console.console_id] = worker
        worker.start()

    # ── worker signal stubs (Tasks 6 & 7) ────────────────────────────

    @pyqtSlot(str, str, int, int, float)
    def _on_progress(self, console_id: str, game_name: str, sent: int, total: int, mbps: float) -> None:
        remaining = total - sent
        self._latest_eta_data[console_id] = (remaining, mbps)
        self.transfer_progress.emit(console_id, game_name, sent, total, mbps)

    @pyqtSlot(str, str, str)
    def _on_job_done(self, console_id: str, game_name: str, note: str) -> None:
        self._job_done_count[console_id] = self._job_done_count.get(console_id, 0) + 1
        self.transfer_done.emit(console_id, game_name, note)

    @pyqtSlot(str, str, str)
    def _on_job_failed(self, console_id: str, game_name: str, error_msg: str) -> None:
        self._job_done_count[console_id] = self._job_done_count.get(console_id, 0) + 1
        self.transfer_failed.emit(console_id, game_name, error_msg)

    @pyqtSlot(str, str, int)
    def _on_retry_attempt(self, console_id: str, game_name: str, attempt: int) -> None:
        self.transfer_retry.emit(console_id, game_name, attempt)

    @pyqtSlot(str, int, int)
    def _on_queue_done(self, console_id: str, success_count: int, fail_count: int) -> None:
        self._latest_eta_data.pop(console_id, None)
        console = self.consoles.get(console_id)
        if console:
            msg = f"{console.label}: carga completa — {success_count} juego(s)"
            if fail_count:
                msg += f", {fail_count} con error"
            self.status_message.emit(msg)
        self.queue_done.emit(console_id, success_count, fail_count)

        pkg_names = self._batch_has_pkg.pop(console_id, [])
        if pkg_names and success_count > 0 and console:
            if console.webman:
                pkg_worker = PkgInstallWorker(console.ip, pkg_names)
                pkg_worker.finished_ok.connect(
                    lambda n, lbl=console.label:
                        self.status_message.emit(f"{lbl}: {n} PKG(s) instalado(s) correctamente")
                )
                pkg_worker.finished_err.connect(
                    lambda err, lbl=console.label:
                        self.status_message.emit(f"{lbl}: error al instalar PKGs — {err}")
                )
                pkg_worker.finished.connect(
                    lambda cid=console_id: self._pkg_install_workers.pop(cid, None)
                )
                self._pkg_install_workers[console_id] = pkg_worker
                pkg_worker.start()
            else:
                self.pkg_guide_required.emit(pkg_names)

        if success_count > 0 and console and console.webman:
            post_worker = WebManPostWorker(console.ip, success_count)
            post_worker.done.connect(
                lambda cid=console_id: self._webman_post_workers.pop(cid, None)
            )
            self._webman_post_workers[console_id] = post_worker
            post_worker.start()

    def _update_eta_status(self) -> None:
        active = [
            (cid, data)
            for cid, data in self._latest_eta_data.items()
            if cid in self.workers and self.workers[cid].isRunning()
        ]
        if not active:
            return
        total_remaining = sum(d[0] for _, d in active)
        speeds = [d[1] for _, d in active if d[1] > 0]
        avg_mbps = sum(speeds) / len(speeds) if speeds else 0.1
        eta_sec = total_remaining / (avg_mbps * 1_048_576)
        if eta_sec < 60:
            eta_str = f"~{max(1, int(eta_sec))} seg"
        else:
            eta_str = f"~{int(eta_sec / 60)} min"
        n = len(active)
        self.status_message.emit(f"{n} consola(s) transfiriendo  —  ETA: {eta_str}")

    @pyqtSlot(str, int)
    def _on_game_size(self, game_name: str, byte_count: int) -> None:
        self._game_size_cache[game_name] = byte_count
        self.game_size_ready.emit(game_name, byte_count)

    @pyqtSlot(str, float)
    def _on_free_space_result(self, console_id: str, free_gb: float) -> None:
        if free_gb >= 0:
            self._free_space_cache[console_id] = free_gb
        self.free_space_ready.emit(console_id, free_gb)

    @pyqtSlot(object)
    def _on_console_found(self, console: ConsoleInfo) -> None:
        if console.console_id in self.consoles:
            return
        self.consoles[console.console_id] = console
        self.console_found.emit(console)
        if self.config.get("auto_mode", False):
            self.load_catalog(console)

    @pyqtSlot()
    def _on_scan_finished(self) -> None:
        count = len(self.consoles)
        self.scan_finished.emit(count)
        if count == 0:
            self.status_message.emit(
                "Sin consolas detectadas. Verifica que estén encendidas y en la misma red."
            )
        else:
            self.status_message.emit(
                f"{count} consola(s) detectada(s). Hace clic en una para ver los juegos."
            )

    @pyqtSlot()
    def _start_health_check(self) -> None:
        if not self.consoles:
            return
        if hasattr(self, '_health_checker') and self._health_checker.isRunning():
            return
        self._health_checker = ConsoleHealthChecker(self.consoles, parent=self)
        self._health_checker.console_online.connect(self._on_console_online)
        self._health_checker.console_offline.connect(self._on_console_offline)
        self._health_checker.start()

    @pyqtSlot(str)
    def _on_console_online(self, console_id: str) -> None:
        self._console_online[console_id] = True
        self.console_online.emit(console_id)

    @pyqtSlot(str)
    def _on_console_offline(self, console_id: str) -> None:
        self._console_online[console_id] = False
        self.console_offline.emit(console_id)
