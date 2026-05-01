import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
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
