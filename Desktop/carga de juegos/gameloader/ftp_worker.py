import ftplib
import time
from collections import deque
from pathlib import Path

from PyQt6.QtCore import QThread, pyqtSignal

from format_detector import GameFormat, get_iso_files
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
            return "La consola rechazo la conexion. Esta encendida y con FTP activo?"
        if isinstance(exc, TimeoutError) or "timed out" in lmsg:
            return "Sin respuesta de la consola. Esta encendida y cerca del router?"
        if isinstance(exc, (EOFError, BrokenPipeError)):
            return "La consola cerro la conexion. Se apago durante la transferencia?"
        if isinstance(exc, OSError):
            if getattr(exc, "errno", None) == 28 or "no space" in lmsg or "space left" in lmsg:
                return "Disco lleno en la consola. Libera espacio antes de continuar."
            if "10051" in msg or "unreachable" in lmsg:
                return "La consola no es alcanzable. Verifica que esta en la misma red."
            if "10061" in msg or "refused" in lmsg:
                return "Conexion rechazada. Esta el servidor FTP activo en la consola?"
            if "10060" in msg or "10065" in msg:
                return "Sin respuesta de la consola. Esta encendida?"
        if isinstance(exc, ftplib.error_perm):
            code = msg[:3]
            if code == "530":
                return "Credenciales FTP incorrectas. Verifica usuario y contrasena."
            if code in ("550", "553"):
                return "Sin permisos para escribir en esa carpeta de la consola."
            if code == "425":
                return "No se pudo abrir canal de datos FTP. Problema de red."
            if code == "426":
                return "Transferencia interrumpida por la consola."
            return f"Error de permisos FTP: {msg[4:80]}"
        if isinstance(exc, ftplib.error_temp):
            return f"Error temporal de FTP. Reintenta en unos segundos. ({msg[:60]})"
        if "connection" in lmsg and ("reset" in lmsg or "abort" in lmsg):
            return "La conexion fue interrumpida. La consola se apago?"
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
        ftp.encoding = "utf-8"
        if self.console.console_type == ConsoleType.PS3:
            ftp.login()
        else:
            ftp.login("xbox", "xbox")
        return ftp

    def _sep(self) -> str:
        return "\\" if self.console.console_type == ConsoleType.XBOX else "/"

    def _join(self, base: str, name: str) -> str:
        return f"{base}{self._sep()}{name}"

    def _remote_dest(self, base_path: str, game_name: str) -> str:
        """Builds remote path ensuring exactly one separator between base and name."""
        return base_path.rstrip("/\\") + self._sep() + game_name

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

    def _remote_total_size(self, ftp: ftplib.FTP, path: str) -> int:
        """
        Returns total bytes of all files under remote path using MLSD.
        Returns -1 if the server doesn't support MLSD or any error occurs.
        """
        total = 0
        try:
            entries = list(ftp.mlsd(path))
            for name, facts in entries:
                if name in (".", ".."):
                    continue
                full = self._join(path, name)
                ftype = facts.get("type", "").lower()
                if ftype in ("dir", "cdir", "pdir"):
                    sub = self._remote_total_size(ftp, full)
                    if sub < 0:
                        return -1
                    total += sub
                else:
                    try:
                        total += int(facts.get("size", 0))
                    except (ValueError, TypeError):
                        try:
                            sz = ftp.size(full)
                            if sz:
                                total += sz
                        except Exception:
                            pass
            return total
        except Exception:
            return -1

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
            raise

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

    def _upload_file(
        self,
        ftp: ftplib.FTP,
        local_file: Path,
        remote_path: str,
        game_name: str,
        velocity_window: deque,
    ):
        """Sube un archivo individual (ISO o PKG) vía STOR."""
        total_size = local_file.stat().st_size
        sent = [0]
        with open(local_file, "rb") as f:
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
            ftp.storbinary(f"STOR {remote_path}", f, 8192, callback)

    def run(self):
        success_count = 0
        fail_count = 0
        abort_queue = False
        try:
            while not self._stop and not abort_queue:
                job: TransferJob = self.queue.next_job(self.console.console_id)
                if job is None:
                    break

                for attempt in range(1, MAX_RETRIES + 1):
                    if self._stop:
                        break
                    ftp = None
                    job.attempts = attempt
                    try:
                        ftp = self._connect()
                        fmt = job.game.format
                        velocity_window: deque = deque()

                        if fmt == GameFormat.ISO:
                            remote_dest = job.remote_base_path.rstrip("/") + "/" + job.game.local_path.name
                            # Check overwrite
                            if not self.overwrite:
                                try:
                                    ftp.size(remote_dest)
                                    # If size() didn't raise, file exists → skip
                                    self.job_done.emit(self.console.console_id, job.game.name, "skipped")
                                    success_count += 1
                                    break
                                except ftplib.error_perm:
                                    pass  # file doesn't exist, continue
                            self._upload_file(ftp, job.game.local_path, remote_dest, job.game.name, velocity_window)

                        elif fmt == GameFormat.PKG:
                            remote_dest = job.remote_base_path.rstrip("/") + "/" + job.game.local_path.name
                            # Check overwrite
                            if not self.overwrite:
                                try:
                                    ftp.size(remote_dest)
                                    # If size() didn't raise, file exists → skip
                                    self.job_done.emit(self.console.console_id, job.game.name, "skipped")
                                    success_count += 1
                                    break
                                except ftplib.error_perm:
                                    pass  # file doesn't exist, continue
                            self._upload_file(ftp, job.game.local_path, remote_dest, job.game.name, velocity_window)

                        elif fmt == GameFormat.ISO_SET:
                            iso_files = get_iso_files(job.game.local_path)
                            all_skipped = True
                            for iso in iso_files:
                                if self._stop:
                                    break
                                remote_dest = job.remote_base_path.rstrip("/") + "/" + iso.name
                                if not self.overwrite:
                                    try:
                                        ftp.size(remote_dest)
                                        continue  # this ISO already exists, skip
                                    except ftplib.error_perm:
                                        pass  # doesn't exist, upload
                                all_skipped = False
                                iso_velocity_window: deque = deque()
                                self._upload_file(ftp, iso, remote_dest, job.game.name, iso_velocity_window)
                            if all_skipped and not self._stop:
                                self.job_done.emit(self.console.console_id, job.game.name, "skipped")
                                success_count += 1
                                break

                        else:  # GameFormat.FOLDER — comportamiento original
                            remote_dest = self._remote_dest(job.remote_base_path, job.game.name)
                            if self._remote_exists(ftp, remote_dest) and not self.overwrite:
                                local_size = self._folder_size(job.game.local_path)
                                remote_size = self._remote_total_size(ftp, remote_dest)
                                # remote_size == -1 → MLSD not supported → assume complete
                                # remote_size >= 90% of local → complete
                                # remote_size < 90% of local → partial, re-transfer
                                is_complete = (
                                    remote_size < 0
                                    or local_size == 0
                                    or remote_size >= local_size * 0.90
                                )
                                if is_complete:
                                    self.job_done.emit(self.console.console_id, job.game.name, "skipped")
                                    success_count += 1
                                    break
                                # else: partial transfer detected — fall through to re-transfer

                            try:
                                ftp.mkd(remote_dest)
                            except ftplib.error_perm:
                                pass

                            total_size = self._folder_size(job.game.local_path)
                            sent = [0]
                            velocity_window2: deque = deque()
                            self._upload_folder(
                                ftp, job.game.local_path, remote_dest,
                                job.game.name, total_size, sent, velocity_window2,
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
        except Exception:
            pass
        finally:
            self.queue_done.emit(self.console.console_id, success_count, fail_count)


class FreeSpaceWorker(QThread):
    """Connects to a console and retrieves available disk space."""
    result = pyqtSignal(str, float)  # console_id, free_gb (-1.0 = not available)

    def __init__(self, console: ConsoleInfo):
        super().__init__()
        self.console = console

    def run(self):
        free_gb = -1.0
        ftp = None
        try:
            ftp = ftplib.FTP()
            ftp.connect(self.console.ip, 21, timeout=5)
            ftp.encoding = "utf-8"
            if self.console.console_type == ConsoleType.PS3:
                ftp.login()
                free_gb = self._ps3_free_space(ftp)
            else:
                ftp.login("xbox", "xbox")
                free_gb = self._xbox_free_space(ftp)
        except Exception:
            pass
        finally:
            if ftp:
                try:
                    ftp.quit()
                except Exception:
                    pass
            self.result.emit(self.console.console_id, free_gb)

    def _ps3_free_space(self, ftp: ftplib.FTP) -> float:
        # webMAN and MultiMAN support the AVBL extension command
        # Response format: "213 <bytes_available>"
        try:
            resp = ftp.sendcmd("AVBL")
            for part in resp.split():
                if part.isdigit() and len(part) > 6:
                    return int(part) / (1024 ** 3)
        except Exception:
            pass
        return -1.0

    def _xbox_free_space(self, ftp: ftplib.FTP) -> float:
        import re
        # Aurora / Freestyle Dash FTP support XDSPACE
        try:
            resp = ftp.sendcmd("XDSPACE")
            numbers = re.findall(r'\d+', resp)
            for n in sorted(numbers, key=len, reverse=True):
                if len(n) > 6:
                    return int(n) / (1024 ** 3)
        except Exception:
            pass
        return -1.0
