import pytest
from pathlib import Path
from queue_manager import QueueManager
from models import TransferJob, GameEntry, ConsoleType


def make_job(name: str) -> TransferJob:
    return TransferJob(
        game=GameEntry(name=name, local_path=Path(f"/fake/{name}"), console_type=ConsoleType.PS3),
        remote_base_path="/dev_hdd0/GAMES/",
    )


def test_add_and_dequeue_in_order():
    qm = QueueManager()
    qm.add_jobs("PS3-105", [make_job("Game A"), make_job("Game B")])
    assert qm.next_job("PS3-105").game.name == "Game A"
    assert qm.next_job("PS3-105").game.name == "Game B"


def test_next_job_on_empty_returns_none():
    qm = QueueManager()
    assert qm.next_job("PS3-105") is None


def test_pending_count_decrements():
    qm = QueueManager()
    qm.add_jobs("PS3-105", [make_job("A"), make_job("B"), make_job("C")])
    assert qm.pending_count("PS3-105") == 3
    qm.next_job("PS3-105")
    assert qm.pending_count("PS3-105") == 2


def test_clear_empties_queue():
    qm = QueueManager()
    qm.add_jobs("PS3-105", [make_job("A"), make_job("B")])
    qm.clear("PS3-105")
    assert qm.pending_count("PS3-105") == 0
    assert qm.next_job("PS3-105") is None


def test_two_consoles_are_independent():
    qm = QueueManager()
    qm.add_jobs("PS3-105", [make_job("PS3 Game")])
    qm.add_jobs("Xbox-110", [make_job("Xbox Game")])
    qm.next_job("PS3-105")
    assert qm.pending_count("PS3-105") == 0
    assert qm.pending_count("Xbox-110") == 1


def test_add_jobs_appends_to_existing():
    qm = QueueManager()
    qm.add_jobs("PS3-105", [make_job("A")])
    qm.add_jobs("PS3-105", [make_job("B")])
    assert qm.pending_count("PS3-105") == 2
