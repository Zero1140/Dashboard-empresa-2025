import ftplib
import time
from collections import deque
from pathlib import Path

from PyQt6.QtCore import QThread, pyqtSignal

from models import ConsoleInfo, ConsoleType, TransferJob
from queue_manager import QueueManager

MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 5


class FTPWorker(QThread):
    # console_id, game_name, bytes_sent, total_bytes, mbps
    progress = pyqtSignal(str, str, int, int, float)
    # console_id, game_name, note ("" or "skipped")
    job_done = pyqtSignal(str, str, str)
    # console_id, game_name, error_msg
    job_failed = pyqtSignal(str, str, str)
    # console_id, game_name, attempt_number
    retry_attempt = pyqtSignal(str, str, int)
    # console_id, success_count, fail_count
    queue_done = pyqtSignal(str, int, int)

    def __init__(self, console: ConsoleInfo, queue: QueueManager, overwrite: bool = False):
        super().__init__()
        self.console = console
        self.queue = queue
        self.overwrite = overwrite
        self._stop = False

    def stop(self):
        self._stop = True

    def _friendly_error(self, exc: Exception) -> str:
        msg = str(exc)
        lmsg = msg.lower()
        if isinstance(exc, ConnectionRefusedError):
            return "La consola rechazó la conexión. ¿Está encendida y con FTP activo?"
        if isinstance(exc, TimeoutError) or "timed out" in lmsg:
            return "Sin respuesta de la consola. ¿Está encendida y cerca del router?"
        if isinstance(exc, (EOFError, BrokenPipeError)):
            return "La consola cerró la conexión. ¿Se apagó durante la transferencia?"
        if isinstance(exc, OSError):
            if getattr(exc, "errno", None) == 28 or "no space" in lmsg or "space left" in lmsg:
                return "Disco lleno en la consola. Liberá espacio antes de continuar."
            if "10051" in msg or "unreachable" in lmsg:
                return "La consola no es alcanzable. Verificá que está en la misma red."
            if "10061" in msg or "refused" in lmsg:
                return "Conexión rechazada. ¿Está el servidor FTP activo en la consola?"
            if "10060" in msg or "10065" in msg:
                return "Sin respuesta de la consola. ¿Está encendida?"
        if isinstance(exc, ftplib.error_perm):
            code = msg[:3]
            if code == "530":
                return "Credenciales FTP incorrectas. Verificá usuario y contraseña."
            if code in ("550", "553"):
                return "Sin permisos para escribir en esa carpeta de la consola."
            if code == "425":
                return "No se pudo abrir canal de datos FTP. Problema de red."
            if code == "426":
                return "Transferencia interrumpida por la consola."
            return f"Error de permisos FTP: {msg[4:80]}"
        if isinstance(exc, ftplib.error_temp):
            return f"Error temporal de FTP. Reintentá en unos segundos. ({msg[:60]})"
        if "connection" in lmsg and ("reset" in lmsg or "abort" in lmsg):
            return "La conexión fue interrumpida. ¿La consola se apagó?"
        if isinstance(exc, FileNotFoundError):
            return f"Archivo local no encontrado: {msg[:60]}"
        if isinstance(exc, PermissionError):
            return f"Sin permisos para leer el archivo: {msg[:60]}"
        return msg[:100]

    @staticmethod
    def _is_permanent_error(exc: Exception) -> bool:
        if isinstance(exc, OSError) and getattr(exc, "errno", None) == 28:
            return True
        if isinstance(exc, ftplib.error_perm):
            code = str(exc)[:3]
            if code in ("530", "550", "553"):
                return True
        if isinstance(exc, (FileNotFoundError, PermissionError)):
            return True
        return False

    def _connect(self) -> ftplib.FTP:
        ftp = ftplib.FTP()
        ftp.connect(self.console.ip, 21, timeout=15)
        if self.console.console_type == ConsoleType.PS3:
            ftp.login()
        else:
            ftp.login("xbox", "xbox")
        return ftp

    def _sep(self) -> str:
        return "\\" if self.console.console_type == ConsoleType.XBOX else "/"

    def _join(self, base: str, name: str) -> str:
        return f"{base}{self._sep()}{name}"

    def _remote_exists(self, ftp: ftplib.FTP, path: str) -> bool:
        original = ftp.pwd()
        try:
            ftp.cwd(path)
            ftp.cwd(original)
            return True
        except ftplib.error_perm:
            return False
        except Exception:
            try:
                ftp.cwd(original)
            except Exception:
                pass
            return False

    def _folder_size(self, path: Path) -> int:
        try:
            return sum(f.stat().st_size for f in path.rglob("*") if f.is_file())
        except (PermissionError, OSError):
            return 0

    def _upload_folder(
        self,
        ftp: ftplib.FTP,
        local_path: Path,
        remote_path: str,
        game_name: str,
        total_size: int,
        sent: list,
        velocity_window: deque,
    ):
        try:
            items = sorted(local_path.iterdir())
        except OSError:
            return

        for item in items:
            if self._stop:
                return
            remote_item = self._join(remote_path, item.name)
            if item.is_dir():
                try:
                    ftp.mkd(remote_item)
                except ftplib.error_perm:
                    pass
                self._upload_folder(
                    ftp, item, remote_item, game_name,
                    total_size, sent, velocity_window,
                )
            else:
                with open(item, "rb") as f:
                    def callback(data, _sent=sent, _vw=velocity_window):
                        _sent[0] += len(data)
                        now = time.monotonic()
                        _vw.append((now, _sent[0]))
                        while len(_vw) > 1 and now - _vw[0][0] > 3.0:
                            _vw.popleft()
                        if len(_vw) >= 2:
                            dt = _vw[-1][0] - _vw[0][0]
                            db = _vw[-1][1] - _vw[0][1]
                            mbps = (db / dt / 1_048_576) if dt > 0 else 0.0
                        else:
                            mbps = 0.0
                        self.progress.emit(
                            self.console.console_id, game_name,
                            _sent[0], total_size, mbps,
                        )
                    ftp.storbinary(f"STOR {remote_item}", f, 8192, callback)

    def run(self):
        success_count = 0
        fail_count = 0
        abort_queue = False

        while not self._stop and not abort_queue:
            job: TransferJob = self.queue.next_job(self.console.console_id)
            if job is None:
                break

            for attempt in range(1, MAX_RETRIES + 1):
                if self._stop:
                    break
                ftp = None
                try:
                    ftp = self._connect()
                    remote_dest = f"{job.remote_base_path}{job.game.name}"

                    if self._remote_exists(ftp, remote_dest) and not self.overwrite:
                        self.job_done.emit(self.console.console_id, job.game.name, "skipped")
                        success_count += 1
                        break

                    try:
                        ftp.mkd(remote_dest)
                    except ftplib.error_perm:
                        pass

                    total_size = self._folder_size(job.game.local_path)
                    sent = [0]
                    velocity_window: deque = deque()
                    self._upload_folder(
                        ftp, job.game.local_path, remote_dest,
                        job.game.name, total_size, sent, velocity_window,
                    )

                    if not self._stop:
                        self.job_done.emit(self.console.console_id, job.game.name, "")
                        success_count += 1
                    break

                except Exception as e:
                    if self._is_permanent_error(e):
                        msg = self._friendly_error(e)
                        self.job_failed.emit(self.console.console_id, job.game.name, msg)
                        fail_count += 1
                        if isinstance(e, OSError) and getattr(e, "errno", None) == 28:
                            abort_queue = True
                        break
                    elif attempt == MAX_RETRIES:
                        msg = self._friendly_error(e)
                        self.job_failed.emit(self.console.console_id, job.game.name, msg)
                        fail_count += 1
                        break
                    else:
                        self.retry_attempt.emit(self.console.console_id, job.game.name, attempt)
                        time.sleep(RETRY_DELAY_SECONDS)
                finally:
                    if ftp is not None:
                        try:
                            ftp.quit()
                        except Exception:
                            pass

        self.queue_done.emit(self.console.console_id, success_count, fail_count)
