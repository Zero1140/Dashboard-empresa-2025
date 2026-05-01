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
