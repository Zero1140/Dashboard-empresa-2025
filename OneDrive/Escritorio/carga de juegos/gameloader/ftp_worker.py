import ftplib
from pathlib import Path

from PyQt6.QtCore import QThread, pyqtSignal

from models import ConsoleInfo, ConsoleType, TransferJob
from queue_manager import QueueManager


class FTPWorker(QThread):
    # console_id, game_name, bytes_sent, total_bytes
    progress = pyqtSignal(str, str, int, int)
    # console_id, game_name, success, error_msg
    job_done = pyqtSignal(str, str, bool, str)
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

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

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

    def _folder_size(self, path: Path) -> int:
        return sum(f.stat().st_size for f in path.rglob("*") if f.is_file())

    def _upload_folder(
        self,
        ftp: ftplib.FTP,
        local_path: Path,
        remote_path: str,
        game_name: str,
        total_size: int,
        sent: list,  # [int] mutable counter
    ):
        for item in sorted(local_path.iterdir()):
            remote_item = self._join(remote_path, item.name)
            if item.is_dir():
                try:
                    ftp.mkd(remote_item)
                except ftplib.error_perm:
                    pass  # ya existe
                self._upload_folder(ftp, item, remote_item, game_name, total_size, sent)
            else:
                with open(item, "rb") as f:
                    def callback(data, _sent=sent):
                        _sent[0] += len(data)
                        self.progress.emit(
                            self.console.console_id, game_name, _sent[0], total_size
                        )
                    ftp.storbinary(f"STOR {remote_item}", f, 8192, callback)

    # ------------------------------------------------------------------
    # Main loop
    # ------------------------------------------------------------------

    def run(self):
        success_count = 0
        fail_count = 0

        while not self._stop:
            job: TransferJob = self.queue.next_job(self.console.console_id)
            if job is None:
                break

            try:
                ftp = self._connect()
                try:
                    remote_dest = f"{job.remote_base_path}{job.game.name}"

                    if self._remote_exists(ftp, remote_dest) and not self.overwrite:
                        self.job_done.emit(self.console.console_id, job.game.name, True, "skipped")
                        success_count += 1
                        continue

                    try:
                        ftp.mkd(remote_dest)
                    except ftplib.error_perm:
                        pass  # ya existe, sobreescribir

                    total_size = self._folder_size(job.game.local_path)
                    sent = [0]
                    self._upload_folder(ftp, job.game.local_path, remote_dest,
                                        job.game.name, total_size, sent)

                    self.job_done.emit(self.console.console_id, job.game.name, True, "")
                    success_count += 1

                finally:
                    try:
                        ftp.quit()
                    except Exception:
                        pass  # conexión ya cerrada o perdida

            except OSError as e:
                # Disco lleno en consola (errno 28) u otros errores de I/O graves
                self.job_done.emit(self.console.console_id, job.game.name, False, str(e))
                fail_count += 1
                if "No space left" in str(e) or "28" in str(e):
                    break  # detener cola de esta consola

            except Exception as e:
                self.job_done.emit(self.console.console_id, job.game.name, False, str(e))
                fail_count += 1

        self.queue_done.emit(self.console.console_id, success_count, fail_count)
