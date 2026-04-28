import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from staging_manager import StagingManager
from models import ConsoleType, GameEntry, TransferJob


def _make_game(name: str, tmp_path: Path) -> GameEntry:
    d = tmp_path / name
    d.mkdir(exist_ok=True)
    (d / "file.bin").write_bytes(b"x" * 1024)
    return GameEntry(name=name, local_path=d, console_type=ConsoleType.PS3)


def test_add_game_to_staging(tmp_path):
    mgr = StagingManager()
    game = _make_game("God of War 3", tmp_path)
    mgr.add("PS3-105", game)
    assert len(mgr.get("PS3-105")) == 1
    assert mgr.get("PS3-105")[0].name == "God of War 3"


def test_remove_game_from_staging(tmp_path):
    mgr = StagingManager()
    game = _make_game("GTA V", tmp_path)
    mgr.add("PS3-105", game)
    mgr.remove("PS3-105", 0)
    assert mgr.get("PS3-105") == []


def test_no_duplicates_in_staging(tmp_path):
    mgr = StagingManager()
    game = _make_game("Batman", tmp_path)
    mgr.add("PS3-105", game)
    mgr.add("PS3-105", game)
    assert len(mgr.get("PS3-105")) == 1


def test_commit_clears_staging_and_returns_jobs(tmp_path):
    mgr = StagingManager()
    game = _make_game("Uncharted", tmp_path)
    mgr.add("PS3-105", game)
    jobs = mgr.commit("PS3-105", "/dev_hdd0/GAMES/")
    assert len(jobs) == 1
    assert isinstance(jobs[0], TransferJob)
    assert jobs[0].game.name == "Uncharted"
    assert jobs[0].remote_base_path == "/dev_hdd0/GAMES/"
    assert mgr.get("PS3-105") == []


def test_total_size_empty():
    mgr = StagingManager()
    assert mgr.total_size_gb("PS3-105") == 0.0


def test_staging_is_per_console(tmp_path):
    mgr = StagingManager()
    game_a = _make_game("GameA", tmp_path)
    game_b = _make_game("GameB", tmp_path)
    mgr.add("PS3-105", game_a)
    mgr.add("Xbox-207", game_b)
    assert len(mgr.get("PS3-105")) == 1
    assert len(mgr.get("Xbox-207")) == 1
    assert mgr.get("PS3-105")[0].name == "GameA"
    assert mgr.get("Xbox-207")[0].name == "GameB"


def test_remove_out_of_bounds_is_noop(tmp_path):
    mgr = StagingManager()
    game = _make_game("TestGame", tmp_path)
    mgr.add("PS3-105", game)
    mgr.remove("PS3-105", 99)
    assert len(mgr.get("PS3-105")) == 1


def test_total_size_gb(tmp_path):
    mgr = StagingManager()
    game = _make_game("BigGame", tmp_path)
    mgr.add("PS3-105", game)
    assert mgr.total_size_gb("PS3-105") > 0.0
