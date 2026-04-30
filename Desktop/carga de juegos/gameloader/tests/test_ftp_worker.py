import sys
import ftplib
from pathlib import Path
from unittest.mock import MagicMock

sys.path.insert(0, str(Path(__file__).parent.parent))

from models import ConsoleInfo, ConsoleType, GameEntry, TransferJob
from queue_manager import QueueManager
from ftp_worker import FTPWorker, FreeSpaceWorker


def _make_worker(tmp_path: Path, overwrite: bool = False):
    game_dir = tmp_path / "game1"
    game_dir.mkdir(exist_ok=True)
    (game_dir / "file.bin").write_bytes(b"x" * 64)

    console = ConsoleInfo(ip="1.2.3.4", console_type=ConsoleType.PS3, label="PS3-Test")
    game = GameEntry(name="game1", local_path=game_dir, console_type=ConsoleType.PS3)
    job = TransferJob(game=game, remote_base_path="/dev_hdd0/GAMES/")

    queue = QueueManager()
    queue.add_jobs(console.console_id, [job])
    return FTPWorker(console=console, queue=queue, overwrite=overwrite)


def _make_ftp_mock(remote_exists=False, remote_size=-1):
    ftp = MagicMock()
    ftp.pwd.return_value = "/"
    ftp.encoding = "utf-8"

    if remote_exists:
        ftp.cwd.return_value = None  # cwd succeeds → dir exists
        ftp.size.return_value = 128  # file exists → return a size
    else:
        ftp.cwd.side_effect = ftplib.error_perm("550 No such directory")
        ftp.size.side_effect = ftplib.error_perm("550 No such file")  # file doesn't exist

    ftp.mlsd.return_value = iter([])
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


def test_path_separator_no_double_slash(tmp_path):
    """Base path with trailing slash must not produce double separator."""
    console = ConsoleInfo(ip="1.2.3.4", console_type=ConsoleType.PS3, label="PS3-Test")
    queue = QueueManager()
    worker = FTPWorker(console=console, queue=queue)

    result = worker._remote_dest("/dev_hdd0/GAMES/", "God of War 3")
    assert result == "/dev_hdd0/GAMES/God of War 3"
    assert "//" not in result


def test_path_separator_adds_slash_when_missing(tmp_path):
    """Base path without trailing slash must still produce valid path."""
    console = ConsoleInfo(ip="1.2.3.4", console_type=ConsoleType.PS3, label="PS3-Test")
    queue = QueueManager()
    worker = FTPWorker(console=console, queue=queue)

    result = worker._remote_dest("/dev_hdd0/GAMES", "God of War 3")
    assert result == "/dev_hdd0/GAMES/God of War 3"


def test_xbox_path_separator(tmp_path):
    """Xbox uses backslash separator."""
    console = ConsoleInfo(ip="1.2.3.4", console_type=ConsoleType.XBOX, label="Xbox-Test")
    queue = QueueManager()
    worker = FTPWorker(console=console, queue=queue)

    result = worker._remote_dest("Hdd1:\\Games\\", "GTA V")
    assert result == "Hdd1:\\Games\\GTA V"
    assert "\\\\" not in result


def test_partial_transfer_retransferred(tmp_path, monkeypatch):
    """If remote folder is <90% of local size, it should be re-transferred."""
    worker = _make_worker(tmp_path)

    done_signals = []
    skipped_signals = []
    worker.job_done.connect(
        lambda cid, gn, note: (skipped_signals if note == "skipped" else done_signals).append(gn)
    )

    local_size = worker._folder_size(worker.queue.all_pending("1.2.3.4")[0].game.local_path)

    mock_ftp = _make_ftp_mock(remote_exists=True)
    # Remote size is only 50% of local → partial
    mock_ftp.mlsd.return_value = iter([("file.bin", {"type": "file", "size": str(local_size // 2)})])

    monkeypatch.setattr(FTPWorker, "_connect", lambda self: mock_ftp)
    worker.run()

    assert done_signals == ["game1"]   # transferred, not skipped
    assert skipped_signals == []


def test_complete_transfer_skipped(tmp_path, monkeypatch):
    """If remote folder matches local size (>=90%), it should be skipped."""
    worker = _make_worker(tmp_path)

    done_signals = []
    skipped_signals = []
    worker.job_done.connect(
        lambda cid, gn, note: (skipped_signals if note == "skipped" else done_signals).append(gn)
    )

    local_size = worker._folder_size(worker.queue.all_pending("1.2.3.4")[0].game.local_path)

    mock_ftp = _make_ftp_mock(remote_exists=True)
    mock_ftp.mlsd.return_value = iter([("file.bin", {"type": "file", "size": str(local_size)})])

    monkeypatch.setattr(FTPWorker, "_connect", lambda self: mock_ftp)
    worker.run()

    assert skipped_signals == ["game1"]   # skipped, not re-transferred
    assert done_signals == []


def test_run_emits_queue_done_on_exception(tmp_path, monkeypatch):
    """Even if run() crashes internally, queue_done must always be emitted."""
    worker = _make_worker(tmp_path)

    queue_done_signals = []
    worker.queue_done.connect(lambda cid, s, f: queue_done_signals.append((s, f)))

    def fake_connect(self):
        raise RuntimeError("unexpected internal crash")

    monkeypatch.setattr(FTPWorker, "_connect", fake_connect)
    monkeypatch.setattr("ftp_worker.time.sleep", lambda s: None)
    worker.run()

    assert len(queue_done_signals) == 1, "queue_done must always fire"


def test_free_space_worker_ps3(monkeypatch):
    """FreeSpaceWorker correctly parses PS3 AVBL response."""
    console = ConsoleInfo(ip="1.2.3.4", console_type=ConsoleType.PS3, label="PS3-Test")
    worker = FreeSpaceWorker(console)

    mock_ftp = MagicMock()
    mock_ftp.encoding = "utf-8"
    mock_ftp.sendcmd.return_value = "213 80000000000"  # ~74.5 GB

    gb = worker._ps3_free_space(mock_ftp)
    assert abs(gb - 80000000000 / (1024 ** 3)) < 0.1


def test_free_space_worker_unavailable(monkeypatch):
    """FreeSpaceWorker returns -1.0 when command is not supported."""
    console = ConsoleInfo(ip="1.2.3.4", console_type=ConsoleType.PS3, label="PS3-Test")
    worker = FreeSpaceWorker(console)

    mock_ftp = MagicMock()
    mock_ftp.sendcmd.side_effect = ftplib.error_perm("500 Unknown command")

    gb = worker._ps3_free_space(mock_ftp)
    assert gb == -1.0


from format_detector import GameFormat


def _make_worker_with_format(tmp_path: Path, fmt: GameFormat, overwrite: bool = False):
    """Helper: crea un worker con un juego del formato dado."""
    if fmt in (GameFormat.ISO, GameFormat.PKG):
        ext = ".iso" if fmt == GameFormat.ISO else ".pkg"
        game_file = tmp_path / f"juego{ext}"
        game_file.write_bytes(b"x" * 128)
        local_path = game_file
        remote_base = "/dev_hdd0/PS3ISO/" if fmt == GameFormat.ISO else "/dev_hdd0/packages/"
    elif fmt == GameFormat.ISO_SET:
        game_dir = tmp_path / "JuegoMultiDisco"
        game_dir.mkdir()
        (game_dir / "disco1.iso").write_bytes(b"x" * 64)
        (game_dir / "disco2.iso").write_bytes(b"x" * 64)
        local_path = game_dir
        remote_base = "/dev_hdd0/PS3ISO/"
    else:  # FOLDER
        game_dir = tmp_path / "BLUS12345"
        game_dir.mkdir()
        (game_dir / "EBOOT.BIN").write_bytes(b"x" * 64)
        local_path = game_dir
        remote_base = "/dev_hdd0/GAMES/"

    console = ConsoleInfo(ip="1.2.3.4", console_type=ConsoleType.PS3, label="PS3-Test")
    game = GameEntry(
        name=local_path.name,
        local_path=local_path,
        console_type=ConsoleType.PS3,
        format=fmt,
    )
    job = TransferJob(game=game, remote_base_path=remote_base)
    queue = QueueManager()
    queue.add_jobs(console.console_id, [job])
    return FTPWorker(console=console, queue=queue, overwrite=overwrite)


def test_iso_upload_calls_storbinary(tmp_path, monkeypatch):
    """ISO sube con STOR directo, no con mkd."""
    worker = _make_worker_with_format(tmp_path, GameFormat.ISO)
    ftp_mock = _make_ftp_mock(remote_exists=False)
    monkeypatch.setattr(worker, "_connect", lambda: ftp_mock)
    worker.run()
    assert ftp_mock.storbinary.called
    assert not ftp_mock.mkd.called


def test_pkg_upload_calls_storbinary(tmp_path, monkeypatch):
    """PKG sube con STOR directo."""
    worker = _make_worker_with_format(tmp_path, GameFormat.PKG)
    ftp_mock = _make_ftp_mock(remote_exists=False)
    monkeypatch.setattr(worker, "_connect", lambda: ftp_mock)
    worker.run()
    assert ftp_mock.storbinary.called


def test_iso_set_uploads_each_iso(tmp_path, monkeypatch):
    """ISO_SET sube cada .iso individualmente — storbinary llamado 2 veces."""
    worker = _make_worker_with_format(tmp_path, GameFormat.ISO_SET)
    ftp_mock = _make_ftp_mock(remote_exists=False)
    monkeypatch.setattr(worker, "_connect", lambda: ftp_mock)
    worker.run()
    assert ftp_mock.storbinary.call_count == 2


def test_folder_upload_uses_mkd(tmp_path, monkeypatch):
    """FOLDER sigue usando el flujo original con mkd."""
    worker = _make_worker_with_format(tmp_path, GameFormat.FOLDER)
    ftp_mock = _make_ftp_mock(remote_exists=False)
    monkeypatch.setattr(worker, "_connect", lambda: ftp_mock)
    worker.run()
    assert ftp_mock.mkd.called
