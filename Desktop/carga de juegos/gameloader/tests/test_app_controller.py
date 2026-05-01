import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from unittest.mock import patch, MagicMock
from app_controller import AppController


def test_app_controller_instantiates(qapp):
    ctrl = AppController({"ps3_root": "", "xbox_root": ""})
    assert ctrl is not None
    ctrl.stop_all_workers()


def test_initial_state_is_empty(qapp):
    ctrl = AppController({"ps3_root": "", "xbox_root": ""})
    assert ctrl.consoles == {}
    assert ctrl.workers == {}
    assert ctrl.is_transferring() is False
    ctrl.stop_all_workers()


def test_start_scan_emits_scan_started(qapp):
    ctrl = AppController({"ps3_root": "", "xbox_root": "", "scan_interval_seconds": 3600})
    received = []
    ctrl.scan_started.connect(lambda: received.append(True))
    with patch("app_controller.ScannerThread") as MockThread:
        instance = MagicMock()
        instance.isRunning.return_value = False
        MockThread.return_value = instance
        ctrl.start_scan()
    assert received == [True]
    ctrl.stop_all_workers()


def test_console_found_stores_and_emits(qapp):
    ctrl = AppController({"ps3_root": "", "xbox_root": "", "scan_interval_seconds": 3600})
    from models import ConsoleInfo, ConsoleType
    console = ConsoleInfo(ip="192.168.1.10", console_type=ConsoleType.PS3, label="PS3")
    found = []
    ctrl.console_found.connect(lambda c: found.append(c))
    ctrl._on_console_found(console)
    assert console.console_id in ctrl.consoles
    assert found == [console]
    ctrl.stop_all_workers()


def test_console_found_ignores_duplicate(qapp):
    ctrl = AppController({"ps3_root": "", "xbox_root": "", "scan_interval_seconds": 3600})
    from models import ConsoleInfo, ConsoleType
    console = ConsoleInfo(ip="192.168.1.10", console_type=ConsoleType.PS3, label="PS3")
    ctrl._on_console_found(console)
    found = []
    ctrl.console_found.connect(lambda c: found.append(c))
    ctrl._on_console_found(console)
    assert len(found) == 0
    ctrl.stop_all_workers()


def test_rename_console_updates_label(qapp):
    ctrl = AppController({"ps3_root": "", "xbox_root": "", "scan_interval_seconds": 3600})
    from models import ConsoleInfo, ConsoleType
    console = ConsoleInfo(ip="192.168.1.10", console_type=ConsoleType.PS3, label="Original")
    ctrl._on_console_found(console)
    ctrl.rename_console("192.168.1.10", "Nuevo Nombre")
    assert ctrl.consoles["192.168.1.10"].label == "Nuevo Nombre"
    ctrl.stop_all_workers()


def test_load_catalog_emits_catalog_ready(qapp):
    ctrl = AppController({"ps3_root": "/fake", "xbox_root": "", "scan_interval_seconds": 3600})
    from models import ConsoleInfo, ConsoleType
    console = ConsoleInfo(ip="192.168.1.10", console_type=ConsoleType.PS3, label="PS3")
    ctrl._on_console_found(console)

    received = []
    ctrl.catalog_ready.connect(lambda c, g, e: received.append((c, g, e)))

    with patch("app_controller._scan_catalog") as mock_cat, \
         patch("app_controller.CatalogSizeWorker") as mock_sw:
        mock_cat.return_value = ([], "Sin juegos")
        mock_sw_instance = MagicMock()
        mock_sw.return_value = mock_sw_instance
        ctrl.load_catalog(console)

    assert len(received) == 1
    assert received[0][0] is console
    assert received[0][2] == "Sin juegos"
    ctrl.stop_all_workers()


def test_load_catalog_starts_size_worker_when_games_found(qapp):
    ctrl = AppController({"ps3_root": "/fake", "xbox_root": "", "scan_interval_seconds": 3600})
    from models import ConsoleInfo, ConsoleType, GameEntry
    from pathlib import Path
    console = ConsoleInfo(ip="192.168.1.10", console_type=ConsoleType.PS3, label="PS3")
    ctrl._on_console_found(console)
    games = [GameEntry(name="GameA", local_path=Path("/fake/GameA"), console_type=ConsoleType.PS3)]

    with patch("app_controller._scan_catalog") as mock_cat, \
         patch("app_controller.CatalogSizeWorker") as mock_sw:
        mock_cat.return_value = (games, "")
        mock_sw_instance = MagicMock()
        mock_sw.return_value = mock_sw_instance
        ctrl.load_catalog(console)
        mock_sw_instance.start.assert_called_once()
    ctrl.stop_all_workers()


def test_free_space_ready_emitted(qapp):
    ctrl = AppController({"ps3_root": "", "xbox_root": "", "scan_interval_seconds": 3600})
    received = []
    ctrl.free_space_ready.connect(lambda cid, gb: received.append((cid, gb)))

    with patch("app_controller.FreeSpaceWorker") as MockFSW:
        instance = MagicMock()
        MockFSW.return_value = instance
        from models import ConsoleInfo, ConsoleType
        console = ConsoleInfo(ip="192.168.1.10", console_type=ConsoleType.PS3, label="PS3")
        ctrl.query_free_space(console)
        # simulate worker result arriving
        ctrl._on_free_space_result("192.168.1.10", 120.5)

    assert received == [("192.168.1.10", 120.5)]
    assert ctrl._free_space_cache["192.168.1.10"] == 120.5
    ctrl.stop_all_workers()
