import sys
import ftplib
from pathlib import Path
from unittest.mock import MagicMock

sys.path.insert(0, str(Path(__file__).parent.parent))

from models import ConsoleInfo, ConsoleType, GameEntry, TransferJob
from queue_manager import QueueManager
from ftp_worker import FTPWorker


def _make_worker(tmp_path: Path):
    game_dir = tmp_path / "game1"
    game_dir.mkdir(exist_ok=True)
    (game_dir / "file.bin").write_bytes(b"x" * 64)

    console = ConsoleInfo(ip="1.2.3.4", console_type=ConsoleType.PS3, label="PS3-Test")
    game = GameEntry(name="game1", local_path=game_dir, console_type=ConsoleType.PS3)
    job = TransferJob(game=game, remote_base_path="/dev_hdd0/GAMES/")

    queue = QueueManager()
    queue.add_jobs(console.console_id, [job])
    return FTPWorker(console=console, queue=queue)


def _make_ftp_mock():
    ftp = MagicMock()
    ftp.pwd.return_value = "/"
    ftp.cwd.side_effect = ftplib.error_perm("550 No such directory")
    ftp.mkd.return_value = None
    ftp.quit.return_value = None

    def fake_storbinary(cmd, f, blocksize, callback):
        callback(f.read())

    ftp.storbinary.side_effect = fake_storbinary
    return ftp


def test_retry_on_timeout(tmp_path, monkeypatch):
    worker = _make_worker(tmp_path)

    retry_signals = []
    done_signals = []
    failed_signals = []

    worker.retry_attempt.connect(lambda cid, gn, n: retry_signals.append(n))
    worker.job_done.connect(lambda cid, gn, note: done_signals.append(gn))
    worker.job_failed.connect(lambda cid, gn, msg: failed_signals.append(gn))

    monkeypatch.setattr("ftp_worker.time.sleep", lambda s: None)

    call_count = [0]
    mock_ftp = _make_ftp_mock()

    def fake_connect(self):
        call_count[0] += 1
        if call_count[0] <= 2:
            raise TimeoutError("timed out")
        return mock_ftp

    monkeypatch.setattr(FTPWorker, "_connect", fake_connect)
    worker.run()

    assert retry_signals == [1, 2]
    assert done_signals == ["game1"]
    assert failed_signals == []


def test_no_retry_on_disk_full(tmp_path, monkeypatch):
    worker = _make_worker(tmp_path)

    retry_signals = []
    failed_signals = []

    worker.retry_attempt.connect(lambda cid, gn, n: retry_signals.append(n))
    worker.job_failed.connect(lambda cid, gn, msg: failed_signals.append(msg))

    def fake_connect(self):
        err = OSError("No space left on device")
        err.errno = 28
        raise err

    monkeypatch.setattr(FTPWorker, "_connect", fake_connect)
    worker.run()

    assert retry_signals == []
    assert len(failed_signals) == 1
    assert "lleno" in failed_signals[0].lower()


def test_no_retry_on_permission_error(tmp_path, monkeypatch):
    worker = _make_worker(tmp_path)

    retry_signals = []
    failed_signals = []

    worker.retry_attempt.connect(lambda cid, gn, n: retry_signals.append(n))
    worker.job_failed.connect(lambda cid, gn, msg: failed_signals.append(gn))

    def fake_connect(self):
        raise ftplib.error_perm("530 Login incorrect")

    monkeypatch.setattr(FTPWorker, "_connect", fake_connect)
    worker.run()

    assert retry_signals == []
    assert failed_signals == ["game1"]
