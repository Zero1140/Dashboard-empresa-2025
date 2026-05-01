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
        worker = FreeSpaceWorker(console)
        worker.result.connect(self._on_free_space_result)
        worker.start()
        self._free_space_worker = worker

    def stage_game(self, console_id: str, game: GameEntry) -> None:
        pass

    def unstage_game(self, console_id: str, index: int) -> None:
        pass

    def get_staged(self, console_id: str) -> List[GameEntry]:
        return []

    def commit_transfer(self, console_id: str) -> None:
        pass

    def cancel_transfer(self, console_id: str) -> None:
        pass

    def retry_job(self, console_id: str, job: TransferJob) -> None:
        pass

    def hen_confirmed(self, console_ip: str) -> None:
        pass

    def commit_transfer_confirmed(self, console_id: str) -> None:
        pass

    def update_config(self, config: dict) -> None:
        pass

    # ── private ───────────────────────────────────────────────────────

    def _update_eta_status(self) -> None:
        pass

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
