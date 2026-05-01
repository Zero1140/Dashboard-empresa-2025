# GameLoader AppController Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract `AppController` from `MainWindow`, enabling full automation from console IP detection to game transfer with zero user clicks.

**Architecture:** `AppController(QObject)` owns all business logic and state; `MainWindow` receives controller via `__init__` and only handles UI display. Communication is strictly one-directional: controller emits `pyqtSignal`s, `MainWindow` calls controller methods. Auto Mode: when `config["auto_mode"]` is `True`, console detection triggers load catalog → stage all → commit_transfer automatically.

**Tech Stack:** Python 3.11+, PyQt6, ftplib, pytest

---

## File Map

| File | Change |
|------|--------|
| `gameloader/app_controller.py` | **CREATE** — all business logic extracted from `main_window.py` |
| `gameloader/main_window.py` | **REFACTOR** — pure UI, ~350 lines; receives `AppController` in `__init__` |
| `gameloader/main.py` | **MODIFY** — instantiate `AppController`, pass to `MainWindow` |
| `gameloader/config.py` | **MODIFY** — add `"auto_mode": False` to `DEFAULT_CONFIG` |
| `gameloader/tests/test_app_controller.py` | **CREATE** — unit tests for controller without UI |

Files unchanged: `ftp_worker.py`, `queue_manager.py`, `staging_manager.py`, `scanner.py`, `detector.py`, `catalog.py`, `format_detector.py`, `models.py`, `webman.py`, `tray.py`, `settings_dialog.py`, `hen_guide_dialog.py`, `pkg_guide_dialog.py`.

---

## Task 1: AppController — scaffold (signals + `__init__`)

**Files:**
- Create: `gameloader/app_controller.py`
- Create: `gameloader/tests/test_app_controller.py`

- [ ] **Step 1: Write the failing test**

```python
# gameloader/tests/test_app_controller.py
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
```

- [ ] **Step 2: Run test to verify it fails**

```
pytest gameloader/tests/test_app_controller.py -v
```
Expected: `ModuleNotFoundError: No module named 'app_controller'`

- [ ] **Step 3: Create `gameloader/app_controller.py` with scaffold**

```python
import socket
from typing import Dict, List, Optional, Tuple

from PyQt6.QtCore import QObject, QThread, QTimer, pyqtSignal, pyqtSlot

from catalog import load_catalog as _scan_catalog, CatalogSizeWorker
from config import save_config
from format_detector import detect_format, remote_path_for_format, GameFormat
from ftp_worker import FTPWorker, FreeSpaceWorker
from models import ConsoleInfo, ConsoleType, GameEntry, TransferJob
from queue_manager import QueueManager
from scanner import ScannerThread, ConsoleHealthChecker
from staging_manager import StagingManager
from webman import WebManClient, WebManPostWorker, PkgInstallWorker


class _ManualConnectWorker(QThread):
    found = pyqtSignal(object)    # ConsoleInfo
    not_found = pyqtSignal(str)   # ip

    def __init__(self, ip: str):
        super().__init__()
        self._ip = ip.strip()

    def run(self):
        from detector import detect_console
        console = detect_console(self._ip)
        if console:
            self.found.emit(console)
        else:
            self.not_found.emit(self._ip)


class AppController(QObject):
    # ── signals toward UI ─────────────────────────────────────────────
    console_found     = pyqtSignal(object)             # ConsoleInfo
    console_online    = pyqtSignal(str)                # console_id
    console_offline   = pyqtSignal(str)                # console_id
    scan_started      = pyqtSignal()
    scan_finished     = pyqtSignal(int)                # n consoles

    catalog_ready     = pyqtSignal(object, list, str)  # console, games, error
    game_size_ready   = pyqtSignal(str, int)           # name, bytes
    free_space_ready  = pyqtSignal(str, float)         # console_id, gb

    transfer_progress = pyqtSignal(str, str, int, int, float)
    transfer_done     = pyqtSignal(str, str, str)
    transfer_failed   = pyqtSignal(str, str, str)
    transfer_retry    = pyqtSignal(str, str, int)
    queue_done        = pyqtSignal(str, int, int)

    hen_required      = pyqtSignal(str, bool)          # ip, has_webman
    space_warning     = pyqtSignal(str, float, float)  # console_id, needed_gb, free_gb
    pkg_guide_required = pyqtSignal(list)              # [pkg_name, ...] (no webMAN)
    status_message    = pyqtSignal(str)

    def __init__(self, config: dict, parent=None):
        super().__init__(parent)
        self.config = config
        self.consoles: Dict[str, ConsoleInfo] = {}
        self.workers: Dict[str, FTPWorker] = {}
        self.queue_manager = QueueManager()
        self.staging_manager = StagingManager()
        self._console_online: Dict[str, bool] = {}
        self._job_totals: Dict[str, int] = {}
        self._job_done_count: Dict[str, int] = {}
        self._job_registry: Dict[Tuple[str, str], TransferJob] = {}
        self._latest_eta_data: Dict[str, Tuple[int, float]] = {}
        self._free_space_cache: Dict[str, float] = {}
        self._game_size_cache: Dict[str, int] = {}
        self._batch_has_pkg: Dict[str, list] = {}
        self._webman_post_workers: Dict[str, QThread] = {}
        self._pkg_install_workers: Dict[str, QThread] = {}
        self._pending_transfer: Dict[str, Tuple[ConsoleInfo, List[TransferJob]]] = {}

        self._scan_timer = QTimer(self)
        self._scan_timer.timeout.connect(self.start_scan)
        self._scan_timer.start(config.get("scan_interval_seconds", 30) * 1000)

        self._eta_timer = QTimer(self)
        self._eta_timer.timeout.connect(self._update_eta_status)
        self._eta_timer.start(1000)

        self._health_timer = QTimer(self)
        self._health_timer.timeout.connect(self._start_health_check)
        self._health_timer.start(15_000)

    # ── public API ────────────────────────────────────────────────────

    def is_transferring(self) -> bool:
        return any(w.isRunning() for w in self.workers.values())

    def stop_all_workers(self) -> None:
        for w in self.workers.values():
            w.stop()
        for w in self.workers.values():
            w.wait(2000)

    def start_scan(self) -> None:
        pass  # implemented in Task 2

    def add_console_by_ip(self, ip: str) -> None:
        pass

    def rename_console(self, console_id: str, new_label: str) -> None:
        pass

    def load_catalog(self, console: ConsoleInfo) -> None:
        pass

    def query_free_space(self, console: ConsoleInfo) -> None:
        pass

    def stage_game(self, console_id: str, game: GameEntry) -> None:
        pass

    def unstage_game(self, console_id: str, index: int) -> None:
        pass

    def get_staged(self, console_id: str) -> List[GameEntry]:
        return []

    def commit_transfer(self, console_id: str) -> None:
        pass

    def cancel_transfer(self, console_id: str) -> None:
        pass

    def retry_job(self, console_id: str, job: TransferJob) -> None:
        pass

    def hen_confirmed(self, console_ip: str) -> None:
        pass

    def commit_transfer_confirmed(self, console_id: str) -> None:
        pass

    def update_config(self, config: dict) -> None:
        pass

    # ── private ───────────────────────────────────────────────────────

    def _update_eta_status(self) -> None:
        pass

    def _start_health_check(self) -> None:
        pass
```

- [ ] **Step 4: Run test to verify it passes**

```
pytest gameloader/tests/test_app_controller.py::test_app_controller_instantiates gameloader/tests/test_app_controller.py::test_initial_state_is_empty -v
```
Expected: PASS

- [ ] **Step 5: Commit**

```
git add gameloader/app_controller.py gameloader/tests/test_app_controller.py
git commit -m "feat: add AppController scaffold with signals and empty method stubs"
```

---

## Task 2: Scan + health check + console management

**Files:**
- Modify: `gameloader/app_controller.py`
- Modify: `gameloader/tests/test_app_controller.py`

- [ ] **Step 1: Write the failing tests**

Append to `gameloader/tests/test_app_controller.py`:

```python
from unittest.mock import patch, MagicMock


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
```

- [ ] **Step 2: Run tests to verify they fail**

```
pytest gameloader/tests/test_app_controller.py::test_start_scan_emits_scan_started gameloader/tests/test_app_controller.py::test_console_found_stores_and_emits -v
```
Expected: FAIL — `start_scan` is `pass` and `_on_console_found` doesn't exist yet

- [ ] **Step 3: Implement scan + health + console management in `app_controller.py`**

Replace the `start_scan`, `add_console_by_ip`, `rename_console`, `_start_health_check` stubs and add internal handlers:

```python
def start_scan(self) -> None:
    if hasattr(self, '_scanner') and self._scanner.isRunning():
        return
    self.scan_started.emit()
    self.status_message.emit("Buscando consolas en la red local...")
    self._scanner = ScannerThread(subnet=self.config.get("scan_subnet", ""))
    self._scanner.console_found.connect(self._on_console_found)
    self._scanner.scan_finished.connect(self._on_scan_finished)
    self._scanner.start()

def add_console_by_ip(self, ip: str) -> None:
    self.status_message.emit(f"Conectando a {ip}...")
    worker = _ManualConnectWorker(ip)
    worker.found.connect(self._on_console_found)
    worker.not_found.connect(
        lambda failed_ip: self.status_message.emit(f"No se encontró consola en {failed_ip}.")
    )
    worker.start()
    self._manual_worker = worker

def rename_console(self, console_id: str, new_label: str) -> None:
    console = self.consoles.get(console_id)
    if console:
        console.label = new_label

@pyqtSlot(object)
def _on_console_found(self, console: ConsoleInfo) -> None:
    if console.console_id in self.consoles:
        return
    self.consoles[console.console_id] = console
    self.console_found.emit(console)
    if self.config.get("auto_mode", False):
        self.load_catalog(console)

@pyqtSlot()
def _on_scan_finished(self) -> None:
    count = len(self.consoles)
    self.scan_finished.emit(count)
    if count == 0:
        self.status_message.emit(
            "Sin consolas detectadas. Verifica que estén encendidas y en la misma red."
        )
    else:
        self.status_message.emit(
            f"{count} consola(s) detectada(s). Hace clic en una para ver los juegos."
        )

def _start_health_check(self) -> None:
    if not self.consoles:
        return
    if hasattr(self, '_health_checker') and self._health_checker.isRunning():
        return
    self._health_checker = ConsoleHealthChecker(self.consoles)
    self._health_checker.console_online.connect(self._on_console_online)
    self._health_checker.console_offline.connect(self._on_console_offline)
    self._health_checker.start()

@pyqtSlot(str)
def _on_console_online(self, console_id: str) -> None:
    self._console_online[console_id] = True
    self.console_online.emit(console_id)

@pyqtSlot(str)
def _on_console_offline(self, console_id: str) -> None:
    self._console_online[console_id] = False
    self.console_offline.emit(console_id)
```

- [ ] **Step 4: Run tests**

```
pytest gameloader/tests/test_app_controller.py -v
```
Expected: all 6 tests PASS

- [ ] **Step 5: Commit**

```
git add gameloader/app_controller.py gameloader/tests/test_app_controller.py
git commit -m "feat(ctrl): implement scan, health check, and console management"
```

---

## Task 3: Catalog + free space

**Files:**
- Modify: `gameloader/app_controller.py`
- Modify: `gameloader/tests/test_app_controller.py`

- [ ] **Step 1: Write the failing tests**

Append to `gameloader/tests/test_app_controller.py`:

```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

```
pytest gameloader/tests/test_app_controller.py::test_load_catalog_emits_catalog_ready -v
```
Expected: FAIL — `load_catalog` is `pass`

- [ ] **Step 3: Implement `load_catalog` and `query_free_space`**

```python
def load_catalog(self, console: ConsoleInfo) -> None:
    root_key = "ps3_root" if console.console_type == ConsoleType.PS3 else "xbox_root"
    games, error_msg = _scan_catalog(self.config.get(root_key, ""), console.console_type)
    self.catalog_ready.emit(console, games, error_msg)
    if games:
        worker = CatalogSizeWorker(games, self)
        worker.size_ready.connect(self._on_game_size)
        worker.start()
        self._size_worker = worker
    if self.config.get("auto_mode", False) and games and not error_msg:
        for game in games:
            self.staging_manager.add(console.console_id, game)
        self.commit_transfer(console.console_id)

def query_free_space(self, console: ConsoleInfo) -> None:
    worker = FreeSpaceWorker(console)
    worker.result.connect(self._on_free_space_result)
    worker.start()
    self._free_space_worker = worker

@pyqtSlot(str, int)
def _on_game_size(self, game_name: str, byte_count: int) -> None:
    self._game_size_cache[game_name] = byte_count
    self.game_size_ready.emit(game_name, byte_count)

@pyqtSlot(str, float)
def _on_free_space_result(self, console_id: str, free_gb: float) -> None:
    if free_gb >= 0:
        self._free_space_cache[console_id] = free_gb
    self.free_space_ready.emit(console_id, free_gb)
```

- [ ] **Step 4: Run tests**

```
pytest gameloader/tests/test_app_controller.py -v
```
Expected: all 9 tests PASS

- [ ] **Step 5: Commit**

```
git add gameloader/app_controller.py gameloader/tests/test_app_controller.py
git commit -m "feat(ctrl): implement load_catalog and query_free_space"
```

---

## Task 4: Staging management

**Files:**
- Modify: `gameloader/app_controller.py`
- Modify: `gameloader/tests/test_app_controller.py`

- [ ] **Step 1: Write the failing tests**

Append to `gameloader/tests/test_app_controller.py`:

```python
def test_stage_and_get_game(qapp):
    from models import ConsoleInfo, ConsoleType, GameEntry
    from pathlib import Path
    ctrl = AppController({"ps3_root": "", "xbox_root": "", "scan_interval_seconds": 3600})
    game = GameEntry(name="GameA", local_path=Path("/fake/GameA"), console_type=ConsoleType.PS3)
    ctrl.stage_game("192.168.1.10", game)
    assert ctrl.get_staged("192.168.1.10") == [game]
    ctrl.stop_all_workers()


def test_unstage_game(qapp):
    from models import ConsoleInfo, ConsoleType, GameEntry
    from pathlib import Path
    ctrl = AppController({"ps3_root": "", "xbox_root": "", "scan_interval_seconds": 3600})
    game = GameEntry(name="GameA", local_path=Path("/fake/GameA"), console_type=ConsoleType.PS3)
    ctrl.stage_game("192.168.1.10", game)
    ctrl.unstage_game("192.168.1.10", 0)
    assert ctrl.get_staged("192.168.1.10") == []
    ctrl.stop_all_workers()
```

- [ ] **Step 2: Run tests to verify they fail**

```
pytest gameloader/tests/test_app_controller.py::test_stage_and_get_game -v
```
Expected: FAIL — `stage_game`, `get_staged` return nothing

- [ ] **Step 3: Implement staging methods**

```python
def stage_game(self, console_id: str, game: GameEntry) -> None:
    self.staging_manager.add(console_id, game)

def unstage_game(self, console_id: str, index: int) -> None:
    self.staging_manager.remove(console_id, index)

def get_staged(self, console_id: str) -> List[GameEntry]:
    return self.staging_manager.get(console_id)
```

- [ ] **Step 4: Run tests**

```
pytest gameloader/tests/test_app_controller.py -v
```
Expected: all 11 tests PASS

- [ ] **Step 5: Commit**

```
git add gameloader/app_controller.py gameloader/tests/test_app_controller.py
git commit -m "feat(ctrl): implement staging management delegation"
```

---

## Task 5: `commit_transfer` — preflight, HEN check, job building

**Files:**
- Modify: `gameloader/app_controller.py`
- Modify: `gameloader/tests/test_app_controller.py`

- [ ] **Step 1: Write the failing tests**

Append to `gameloader/tests/test_app_controller.py`:

```python
def _make_ps3_console(ip="192.168.1.10") -> "ConsoleInfo":
    from models import ConsoleInfo, ConsoleType
    return ConsoleInfo(ip=ip, console_type=ConsoleType.PS3, label="PS3", webman=False)


def test_commit_transfer_preflight_fail_emits_status(qapp):
    ctrl = AppController({"ps3_root": "", "xbox_root": "", "scan_interval_seconds": 3600})
    console = _make_ps3_console()
    ctrl._on_console_found(console)

    msgs = []
    ctrl.status_message.connect(msgs.append)

    with patch.object(ctrl, "_preflight_ok", return_value=False):
        ctrl.commit_transfer("192.168.1.10")

    assert any("FTP" in m or "encendida" in m or "conectar" in m for m in msgs)


def test_commit_transfer_hen_fail_emits_hen_required(qapp):
    ctrl = AppController({"ps3_root": "", "xbox_root": "", "scan_interval_seconds": 3600})
    console = _make_ps3_console()
    ctrl._on_console_found(console)

    hen_signals = []
    ctrl.hen_required.connect(lambda ip, wm: hen_signals.append((ip, wm)))

    with patch.object(ctrl, "_preflight_ok", return_value=True), \
         patch.object(ctrl, "_hen_ok", return_value=False):
        ctrl.commit_transfer("192.168.1.10")

    assert hen_signals == [("192.168.1.10", False)]


def test_commit_transfer_unknown_console_is_noop(qapp):
    ctrl = AppController({"ps3_root": "", "xbox_root": "", "scan_interval_seconds": 3600})
    ctrl.commit_transfer("99.99.99.99")  # should not raise
    ctrl.stop_all_workers()
```

- [ ] **Step 2: Run tests to verify they fail**

```
pytest gameloader/tests/test_app_controller.py::test_commit_transfer_preflight_fail_emits_status -v
```
Expected: FAIL — `commit_transfer` is `pass`

- [ ] **Step 3: Implement `commit_transfer`, helpers, and `hen_confirmed`**

```python
def commit_transfer(self, console_id: str) -> None:
    console = self.consoles.get(console_id)
    if not console:
        return
    if not self._preflight_ok(console):
        self.status_message.emit(
            f"No se pudo conectar a {console.label} ({console.ip}). "
            "Verifica que la consola esté encendida y con FTP activo."
        )
        return
    if not self._hen_ok(console):
        self.hen_required.emit(console.ip, console.webman)
        return
    self._build_and_enqueue(console_id)

def hen_confirmed(self, console_ip: str) -> None:
    console = self.consoles.get(console_ip)
    if not console:
        return
    if not self._hen_ok(console):
        self.status_message.emit("Transferencia cancelada: HEN no está activo.")
        return
    self._build_and_enqueue(console.console_id)

def commit_transfer_confirmed(self, console_id: str) -> None:
    entry = self._pending_transfer.pop(console_id, None)
    if entry is None:
        return
    console, jobs = entry
    self._enqueue_jobs(console, jobs)

def _preflight_ok(self, console: ConsoleInfo) -> bool:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(2.0)
        result = s.connect_ex((console.ip, 21))
        s.close()
        return result == 0
    except Exception:
        return False

def _hen_ok(self, console: ConsoleInfo) -> bool:
    if console.console_type != ConsoleType.PS3:
        return True
    if console.webman:
        return WebManClient(console.ip).is_hen_active()
    from detector import verify_hen
    return verify_hen(console.ip)

def _build_and_enqueue(self, console_id: str) -> None:
    console = self.consoles[console_id]
    staged = self.staging_manager.get(console_id)
    if not staged:
        return

    jobs: List[TransferJob] = []
    for game in staged:
        if console.console_type == ConsoleType.PS3:
            try:
                fmt = detect_format(game.local_path)
                game.format = fmt
                remote_base = remote_path_for_format(fmt, self.config)
            except (FileNotFoundError, ValueError) as e:
                remote_base = self.config.get("ps3_remote_path", "/dev_hdd0/GAMES/")
                self.status_message.emit(
                    f"Advertencia: formato desconocido para '{game.name}' — usando GAMES/ ({e})"
                )
        else:
            remote_base = self.config.get("xbox_remote_path", "Hdd1:\\Games\\")

        if not remote_base:
            self.status_message.emit(
                f"Ruta remota para {console.console_type.value} no configurada. "
                "Configurala en Archivo → Configuración."
            )
            return
        jobs.append(TransferJob(game=game, remote_base_path=remote_base))

    self._batch_has_pkg[console_id] = [
        job.game.name for job in jobs if job.game.format == GameFormat.PKG
    ]

    total_bytes = sum(self._game_size_cache.get(job.game.name, 0) for job in jobs)
    free_gb = self._free_space_cache.get(console_id, -1.0)
    total_gb = total_bytes / (1024 ** 3) if total_bytes > 0 else 0.0

    if total_bytes > 0 and free_gb >= 0 and total_gb > free_gb * 0.95:
        self._pending_transfer[console_id] = (console, jobs)
        self.space_warning.emit(console_id, total_gb, free_gb)
        return

    self._enqueue_jobs(console, jobs)

def _enqueue_jobs(self, console: ConsoleInfo, jobs: List[TransferJob]) -> None:
    self.staging_manager.clear(console.console_id)
    self._job_totals[console.console_id] = len(jobs)
    self._job_done_count[console.console_id] = 0
    for job in jobs:
        self._job_registry[(console.console_id, job.game.name)] = job
    self.queue_manager.add_jobs(console.console_id, jobs)
    self._ensure_worker_running(console)
    self.status_message.emit(
        f"Iniciando carga de {len(jobs)} juego(s) en {console.label}..."
    )

def _ensure_worker_running(self, console: ConsoleInfo) -> None:
    existing = self.workers.get(console.console_id)
    if existing and existing.isRunning():
        return
    worker = FTPWorker(
        console=console,
        queue=self.queue_manager,
        overwrite=self.config.get("overwrite_existing", False),
    )
    worker.progress.connect(self._on_progress)
    worker.job_done.connect(self._on_job_done)
    worker.job_failed.connect(self._on_job_failed)
    worker.retry_attempt.connect(self._on_retry_attempt)
    worker.queue_done.connect(self._on_queue_done)
    self.workers[console.console_id] = worker
    worker.start()
```

- [ ] **Step 4: Run tests**

```
pytest gameloader/tests/test_app_controller.py -v
```
Expected: all 14 tests PASS

- [ ] **Step 5: Commit**

```
git add gameloader/app_controller.py gameloader/tests/test_app_controller.py
git commit -m "feat(ctrl): implement commit_transfer, preflight, HEN check, job building"
```

---

## Task 6: Worker lifecycle + signal forwarding (cancel, retry, progress)

**Files:**
- Modify: `gameloader/app_controller.py`
- Modify: `gameloader/tests/test_app_controller.py`

- [ ] **Step 1: Write the failing tests**

Append to `gameloader/tests/test_app_controller.py`:

```python
def test_cancel_transfer_stops_worker_and_clears_queue(qapp):
    ctrl = AppController({"ps3_root": "", "xbox_root": "", "scan_interval_seconds": 3600})
    console = _make_ps3_console()
    ctrl._on_console_found(console)

    mock_worker = MagicMock()
    mock_worker.isRunning.return_value = True
    ctrl.workers["192.168.1.10"] = mock_worker

    ctrl.cancel_transfer("192.168.1.10")

    mock_worker.stop.assert_called_once()
    assert ctrl.queue_manager.pending_count("192.168.1.10") == 0
    ctrl.stop_all_workers()


def test_progress_forwarded_to_signal(qapp):
    ctrl = AppController({"ps3_root": "", "xbox_root": "", "scan_interval_seconds": 3600})
    received = []
    ctrl.transfer_progress.connect(lambda *args: received.append(args))
    ctrl._on_progress("192.168.1.10", "GameA", 500, 1000, 5.0)
    assert received == [("192.168.1.10", "GameA", 500, 1000, 5.0)]
    ctrl.stop_all_workers()


def test_job_done_increments_counter(qapp):
    ctrl = AppController({"ps3_root": "", "xbox_root": "", "scan_interval_seconds": 3600})
    ctrl._job_done_count["192.168.1.10"] = 0
    ctrl._on_job_done("192.168.1.10", "GameA", "")
    assert ctrl._job_done_count["192.168.1.10"] == 1
    ctrl.stop_all_workers()
```

- [ ] **Step 2: Run tests to verify they fail**

```
pytest gameloader/tests/test_app_controller.py::test_cancel_transfer_stops_worker_and_clears_queue -v
```
Expected: FAIL — `cancel_transfer` is `pass`

- [ ] **Step 3: Implement cancel, retry, and signal-forwarding slots**

```python
def cancel_transfer(self, console_id: str) -> None:
    worker = self.workers.get(console_id)
    if worker and worker.isRunning():
        worker.stop()
    self.queue_manager.clear(console_id)

def retry_job(self, console_id: str, job: TransferJob) -> None:
    console = self.consoles.get(console_id)
    if not console:
        return
    self._job_done_count[console_id] = max(0, self._job_done_count.get(console_id, 0) - 1)
    self.queue_manager.add_jobs(console_id, [job])
    self._ensure_worker_running(console)

@pyqtSlot(str, str, int, int, float)
def _on_progress(self, console_id: str, game_name: str, sent: int, total: int, mbps: float) -> None:
    remaining = total - sent
    self._latest_eta_data[console_id] = (remaining, mbps)
    self.transfer_progress.emit(console_id, game_name, sent, total, mbps)

@pyqtSlot(str, str, str)
def _on_job_done(self, console_id: str, game_name: str, note: str) -> None:
    self._job_done_count[console_id] = self._job_done_count.get(console_id, 0) + 1
    self.transfer_done.emit(console_id, game_name, note)

@pyqtSlot(str, str, str)
def _on_job_failed(self, console_id: str, game_name: str, error_msg: str) -> None:
    self._job_done_count[console_id] = self._job_done_count.get(console_id, 0) + 1
    self.transfer_failed.emit(console_id, game_name, error_msg)

@pyqtSlot(str, str, int)
def _on_retry_attempt(self, console_id: str, game_name: str, attempt: int) -> None:
    self.transfer_retry.emit(console_id, game_name, attempt)
```

- [ ] **Step 4: Run tests**

```
pytest gameloader/tests/test_app_controller.py -v
```
Expected: all 17 tests PASS

- [ ] **Step 5: Commit**

```
git add gameloader/app_controller.py gameloader/tests/test_app_controller.py
git commit -m "feat(ctrl): implement cancel, retry, and signal forwarding slots"
```

---

## Task 7: `queue_done` + Auto Mode + ETA

**Files:**
- Modify: `gameloader/app_controller.py`
- Modify: `gameloader/tests/test_app_controller.py`

- [ ] **Step 1: Write the failing tests**

Append to `gameloader/tests/test_app_controller.py`:

```python
def test_queue_done_emits_signal(qapp):
    ctrl = AppController({"ps3_root": "", "xbox_root": "", "scan_interval_seconds": 3600})
    console = _make_ps3_console()
    ctrl._on_console_found(console)
    received = []
    ctrl.queue_done.connect(lambda cid, ok, fail: received.append((cid, ok, fail)))
    ctrl._on_queue_done("192.168.1.10", 3, 0)
    assert received == [("192.168.1.10", 3, 0)]
    ctrl.stop_all_workers()


def test_auto_mode_queues_all_on_detection(qapp):
    ctrl = AppController({
        "ps3_root": "/fake", "xbox_root": "",
        "auto_mode": True,
        "scan_interval_seconds": 3600,
    })
    from models import ConsoleInfo, ConsoleType, GameEntry
    from pathlib import Path
    console = ConsoleInfo(ip="192.168.1.10", console_type=ConsoleType.PS3, label="PS3")
    games = [
        GameEntry(name="GameA", local_path=Path("/fake/GameA"), console_type=ConsoleType.PS3),
        GameEntry(name="GameB", local_path=Path("/fake/GameB"), console_type=ConsoleType.PS3),
    ]
    with patch("app_controller._scan_catalog") as mock_cat, \
         patch("app_controller.CatalogSizeWorker") as mock_sw, \
         patch.object(ctrl, "commit_transfer") as mock_commit, \
         patch.object(ctrl, "_preflight_ok", return_value=True):
        mock_cat.return_value = (games, "")
        mock_sw.return_value = MagicMock()
        ctrl._on_console_found(console)

    assert ctrl.staging_manager.get("192.168.1.10") == games
    mock_commit.assert_called_once_with("192.168.1.10")
    ctrl.stop_all_workers()
```

- [ ] **Step 2: Run tests to verify they fail**

```
pytest gameloader/tests/test_app_controller.py::test_queue_done_emits_signal gameloader/tests/test_app_controller.py::test_auto_mode_queues_all_on_detection -v
```
Expected: FAIL

- [ ] **Step 3: Implement `_on_queue_done` and `_update_eta_status`**

```python
@pyqtSlot(str, int, int)
def _on_queue_done(self, console_id: str, success_count: int, fail_count: int) -> None:
    self._latest_eta_data.pop(console_id, None)
    console = self.consoles.get(console_id)
    if console:
        msg = f"{console.label}: carga completa — {success_count} juego(s)"
        if fail_count:
            msg += f", {fail_count} con error"
        self.status_message.emit(msg)
    self.queue_done.emit(console_id, success_count, fail_count)

    pkg_names = self._batch_has_pkg.pop(console_id, [])
    if pkg_names and success_count > 0 and console:
        if console.webman:
            pkg_worker = PkgInstallWorker(console.ip, pkg_names)
            pkg_worker.finished_ok.connect(
                lambda n, lbl=console.label:
                    self.status_message.emit(f"{lbl}: {n} PKG(s) instalado(s) correctamente")
            )
            pkg_worker.finished_err.connect(
                lambda err, lbl=console.label:
                    self.status_message.emit(f"{lbl}: error al instalar PKGs — {err}")
            )
            pkg_worker.finished.connect(
                lambda cid=console_id: self._pkg_install_workers.pop(cid, None)
            )
            self._pkg_install_workers[console_id] = pkg_worker
            pkg_worker.start()
        else:
            self.pkg_guide_required.emit(pkg_names)

    if success_count > 0 and console and console.webman:
        post_worker = WebManPostWorker(console.ip, success_count)
        post_worker.finished.connect(
            lambda cid=console_id: self._webman_post_workers.pop(cid, None)
        )
        self._webman_post_workers[console_id] = post_worker
        post_worker.start()

def _update_eta_status(self) -> None:
    active = [
        (cid, data)
        for cid, data in self._latest_eta_data.items()
        if cid in self.workers and self.workers[cid].isRunning()
    ]
    if not active:
        return
    total_remaining = sum(d[0] for _, d in active)
    speeds = [d[1] for _, d in active if d[1] > 0]
    avg_mbps = sum(speeds) / len(speeds) if speeds else 0.1
    eta_sec = total_remaining / (avg_mbps * 1_048_576)
    if eta_sec < 60:
        eta_str = f"~{max(1, int(eta_sec))} seg"
    else:
        eta_str = f"~{int(eta_sec / 60)} min"
    n = len(active)
    self.status_message.emit(f"{n} consola(s) transfiriendo  —  ETA: {eta_str}")
```

- [ ] **Step 4: Run tests**

```
pytest gameloader/tests/test_app_controller.py -v
```
Expected: all 19 tests PASS

- [ ] **Step 5: Commit**

```
git add gameloader/app_controller.py gameloader/tests/test_app_controller.py
git commit -m "feat(ctrl): implement queue_done handler, webMAN post-transfer, Auto Mode, ETA"
```

---

## Task 8: Config + shutdown + `DEFAULT_CONFIG`

**Files:**
- Modify: `gameloader/app_controller.py`
- Modify: `gameloader/config.py`
- Modify: `gameloader/tests/test_app_controller.py`

- [ ] **Step 1: Write the failing tests**

Append to `gameloader/tests/test_app_controller.py`:

```python
def test_is_transferring_true_when_worker_running(qapp):
    ctrl = AppController({"ps3_root": "", "xbox_root": "", "scan_interval_seconds": 3600})
    mock_worker = MagicMock()
    mock_worker.isRunning.return_value = True
    ctrl.workers["192.168.1.10"] = mock_worker
    assert ctrl.is_transferring() is True
    ctrl.stop_all_workers()


def test_update_config_changes_scan_interval(qapp):
    ctrl = AppController({"ps3_root": "", "xbox_root": "", "scan_interval_seconds": 30})
    with patch("app_controller.save_config") as mock_save:
        ctrl.update_config({"ps3_root": "", "xbox_root": "", "scan_interval_seconds": 60})
        mock_save.assert_called_once()
    assert ctrl._scan_timer.interval() == 60_000
    ctrl.stop_all_workers()
```

Also verify `auto_mode` exists in DEFAULT_CONFIG:

```python
def test_default_config_has_auto_mode():
    from config import DEFAULT_CONFIG
    assert "auto_mode" in DEFAULT_CONFIG
    assert DEFAULT_CONFIG["auto_mode"] is False
```

- [ ] **Step 2: Run tests to verify they fail**

```
pytest gameloader/tests/test_app_controller.py::test_update_config_changes_scan_interval gameloader/tests/test_app_controller.py::test_default_config_has_auto_mode -v
```
Expected: FAIL

- [ ] **Step 3a: Add `auto_mode` to `gameloader/config.py`**

In `DEFAULT_CONFIG` dict, add the new key:

```python
DEFAULT_CONFIG = {
    "ps3_root": "",
    "xbox_root": "",
    "ps3_remote_path": "/dev_hdd0/GAMES/",
    "ps3_iso_path": "/dev_hdd0/PS3ISO/",
    "ps3_pkg_path": "/dev_hdd0/packages/",
    "xbox_remote_path": "Hdd1:\\Games\\",
    "scan_interval_seconds": 30,
    "scan_subnet": "",
    "autostart_windows": False,
    "overwrite_existing": False,
    "auto_mode": False,          # ← ADD THIS LINE
}
```

- [ ] **Step 3b: Implement `update_config` and `stop_all_workers` in `app_controller.py`**

```python
def update_config(self, config: dict) -> None:
    self.config = config
    self._scan_timer.setInterval(config.get("scan_interval_seconds", 30) * 1000)
    save_config(config)

def stop_all_workers(self) -> None:
    for w in self.workers.values():
        w.stop()
    for w in self.workers.values():
        w.wait(2000)
```

- [ ] **Step 4: Run tests**

```
pytest gameloader/tests/test_app_controller.py -v
```
Expected: all 22 tests PASS

- [ ] **Step 5: Commit**

```
git add gameloader/app_controller.py gameloader/config.py gameloader/tests/test_app_controller.py
git commit -m "feat(ctrl): implement update_config, stop_all_workers; add auto_mode to DEFAULT_CONFIG"
```

---

## Task 9: Refactor `MainWindow` + update `main.py`

**Files:**
- Modify: `gameloader/main_window.py` — strip business logic, wire up controller
- Modify: `gameloader/main.py` — instantiate AppController, pass to MainWindow

This task has no new unit tests (all behavior is tested via AppController tests). The existing UI smoke-test is `python gameloader/main.py`.

- [ ] **Step 1: Update `MainWindow.__init__` signature**

Change the top of `MainWindow`:

```python
# OLD:
class MainWindow(QMainWindow):
    def __init__(self, config: dict):
        super().__init__()
        self.config = config
        self.consoles: Dict[str, ConsoleInfo] = {}
        self.workers: Dict[str, FTPWorker] = {}
        self.queue_manager = QueueManager()
        self.staging_manager = StagingManager()
        self.selected_console: Optional[ConsoleInfo] = None
        self._job_totals: Dict[str, int] = {}
        self._job_done_count: Dict[str, int] = {}
        self._job_registry: Dict[Tuple[str, str], TransferJob] = {}
        self._latest_eta_data: Dict[str, Tuple[int, float]] = {}
        self._console_online: Dict[str, bool] = {}
        self._game_size_cache: Dict[str, int] = {}
        self._free_space_cache: Dict[str, float] = {}
        self._batch_has_pkg: Dict[str, list] = {}
        self._progress_rows: Dict[str, int] = {}
        self._webman_post_workers: Dict[str, QThread] = {}
        self._pkg_install_workers: Dict[str, QThread] = {}
        self._setup_ui()
        self._setup_tray()
        self._start_scan()
        self._scan_timer = QTimer(self)
        self._scan_timer.timeout.connect(self._start_scan)
        self._scan_timer.start(config.get("scan_interval_seconds", 30) * 1000)
        self._eta_timer = QTimer(self)
        self._eta_timer.timeout.connect(self._update_eta_status)
        self._eta_timer.start(1000)
        self._health_timer = QTimer(self)
        self._health_timer.timeout.connect(self._start_health_check)
        self._health_timer.start(15_000)

# NEW:
class MainWindow(QMainWindow):
    def __init__(self, ctrl: "AppController", config: dict):
        super().__init__()
        self.ctrl = ctrl
        self.config = config
        self.selected_console: Optional[ConsoleInfo] = None
        self._progress_rows: Dict[str, int] = {}
        self._job_totals: Dict[str, int] = {}
        self._job_done_count: Dict[str, int] = {}
        self._job_registry: Dict[Tuple[str, str], TransferJob] = {}
        self._setup_ui()
        self._setup_tray()
        self._connect_controller_signals()
```

Add the TYPE_CHECKING import at the top of `main_window.py`:

```python
from __future__ import annotations
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app_controller import AppController
```

- [ ] **Step 2: Remove unused imports from `main_window.py`**

Remove these lines from the import block at the top:

```python
# DELETE these imports:
from catalog import load_catalog, CatalogSizeWorker
from format_detector import detect_format, remote_path_for_format
from ftp_worker import FTPWorker, FreeSpaceWorker, MAX_RETRIES
from queue_manager import QueueManager
from scanner import ScannerThread, ConsoleHealthChecker
from staging_manager import StagingManager
from webman import WebManClient, WebManPostWorker, PkgInstallWorker
```

Keep only UI-related imports:

```python
from catalog import load_catalog  # still needed for _on_catalog_ready table row
```

Wait — `_on_catalog_ready` in MainWindow calls `load_catalog` via the catalog_ready signal, which already has `games` list passed in. So `load_catalog` is NOT needed in MainWindow.

Final import block for `main_window.py` after refactor:

```python
import socket
from __future__ import annotations
from typing import Dict, Optional, Tuple, TYPE_CHECKING

from PyQt6.QtCore import Qt, QThread, QTimer, pyqtSignal, pyqtSlot
from PyQt6.QtGui import QAction, QColor
from PyQt6.QtWidgets import (
    QApplication, QFrame, QHeaderView, QInputDialog, QLabel,
    QLineEdit, QListWidget, QListWidgetItem, QMainWindow,
    QMessageBox, QProgressBar, QPushButton, QSplitter,
    QTableWidget, QTableWidgetItem, QVBoxLayout, QHBoxLayout, QWidget,
    QMenuBar, QToolBar,
)

from config import save_config
from hen_guide_dialog import HenGuideDialog
from pkg_guide_dialog import PkgGuideDialog
from models import ConsoleInfo, ConsoleType, GameEntry, TransferJob
from settings_dialog import SettingsDialog
from tray import SystemTray, set_autostart

if TYPE_CHECKING:
    from app_controller import AppController
```

Note: `socket` is still needed for `_preflight_ok` — but that moves to AppController, so remove it too.

Correct final imports for `main_window.py`:

```python
from __future__ import annotations
from typing import Dict, Optional, Tuple, TYPE_CHECKING

from PyQt6.QtCore import Qt, pyqtSlot
from PyQt6.QtGui import QAction, QColor
from PyQt6.QtWidgets import (
    QApplication, QFrame, QHeaderView, QInputDialog, QLabel,
    QLineEdit, QListWidget, QListWidgetItem, QMainWindow,
    QMessageBox, QProgressBar, QPushButton, QSplitter,
    QTableWidget, QTableWidgetItem, QVBoxLayout, QHBoxLayout, QWidget,
    QMenuBar, QToolBar,
)

from config import save_config
from hen_guide_dialog import HenGuideDialog
from pkg_guide_dialog import PkgGuideDialog
from models import ConsoleInfo, ConsoleType, GameEntry, TransferJob
from settings_dialog import SettingsDialog
from tray import SystemTray, set_autostart

if TYPE_CHECKING:
    from app_controller import AppController

_FORMAT_BADGE = {
    "folder": "CARPETA",
    "iso": "ISO",
    "iso_set": "MULTI-ISO",
    "pkg": "PKG",
}
```

- [ ] **Step 3: Add `_connect_controller_signals` method**

Add this method to `MainWindow` (replaces all the old signal wiring that was scattered in `__init__` and individual workers):

```python
def _connect_controller_signals(self) -> None:
    self.ctrl.console_found.connect(self._on_console_found)
    self.ctrl.console_online.connect(self._on_console_online)
    self.ctrl.console_offline.connect(self._on_console_offline)
    self.ctrl.scan_started.connect(self._on_scan_started)
    self.ctrl.scan_finished.connect(self._on_scan_finished)
    self.ctrl.catalog_ready.connect(self._on_catalog_ready)
    self.ctrl.game_size_ready.connect(self._on_game_size)
    self.ctrl.free_space_ready.connect(self._on_free_space_result)
    self.ctrl.transfer_progress.connect(self._on_progress)
    self.ctrl.transfer_done.connect(self._on_job_done)
    self.ctrl.transfer_failed.connect(self._on_job_failed)
    self.ctrl.transfer_retry.connect(self._on_retry_attempt)
    self.ctrl.queue_done.connect(self._on_queue_done)
    self.ctrl.hen_required.connect(self._on_hen_required)
    self.ctrl.space_warning.connect(self._on_space_warning)
    self.ctrl.pkg_guide_required.connect(self._on_pkg_guide_required)
    self.ctrl.status_message.connect(self._status)

def _on_scan_started(self) -> None:
    self.btn_scan.setEnabled(False)
    self.btn_scan.setText("Buscando...")
    if hasattr(self, '_act_scan'):
        self._act_scan.setEnabled(False)
    self._status("Buscando consolas en la red local...")

def _on_hen_required(self, console_ip: str, has_webman: bool) -> None:
    dlg = HenGuideDialog(console_ip, has_webman, self)
    dlg.exec()
    self.ctrl.hen_confirmed(console_ip)

def _on_space_warning(self, console_id: str, needed_gb: float, free_gb: float) -> None:
    console = self.ctrl.consoles.get(console_id)
    label = console.label if console else console_id
    resp = QMessageBox.warning(
        self, "Espacio insuficiente",
        f"Los juegos seleccionados ocupan ~{needed_gb:.1f} GB,\n"
        f"pero la consola solo tiene {free_gb:.1f} GB libres.\n\n"
        "Si continuás, algunos juegos pueden quedar incompletos.\n\n"
        "¿Continuar de todas formas?",
        QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
        QMessageBox.StandardButton.No,
    )
    if resp == QMessageBox.StandardButton.Yes:
        self.ctrl.commit_transfer_confirmed(console_id)

def _on_pkg_guide_required(self, pkg_names: list) -> None:
    guide = PkgGuideDialog(pkg_names, self)
    guide.exec()
```

- [ ] **Step 4: Replace button wiring in `_setup_toolbar` and `_setup_ui`**

Anywhere in `MainWindow` that previously called internal methods directly, redirect to the controller:

```python
# In _setup_toolbar:
self.btn_scan.clicked.connect(self.ctrl.start_scan)

# In _setup_ui (staging panel):
self.btn_start_transfer.clicked.connect(self._on_start_transfer_clicked)

# New helper:
def _on_start_transfer_clicked(self) -> None:
    if self.selected_console:
        self.ctrl.commit_transfer(self.selected_console.console_id)
```

Replace the `_add_to_staging` call in catalog table button:

```python
# OLD:
btn.clicked.connect(lambda _, g=game: self._add_to_staging(g))

# NEW (inside _on_catalog_ready):
btn.clicked.connect(lambda _, g=game: (
    self.ctrl.stage_game(self.selected_console.console_id, g),
    self._refresh_staging_panel(),
))
```

Replace `_remove_from_staging` in staging panel:

```python
# OLD:
btn_rm.clicked.connect(lambda _, i=idx: self._remove_from_staging(i))

# NEW (inside _refresh_staging_panel):
btn_rm.clicked.connect(lambda _, i=idx: (
    self.ctrl.unstage_game(self.selected_console.console_id, i),
    self._refresh_staging_panel(),
))
```

Replace cancel button in progress table:

```python
# OLD:
btn_cancel.clicked.connect(lambda _, cid=console.console_id: self._cancel_transfer(cid))

# NEW:
btn_cancel.clicked.connect(lambda _, cid=console.console_id: self.ctrl.cancel_transfer(cid))
```

Replace retry button in `_on_job_failed`:

```python
# OLD:
btn_retry.clicked.connect(lambda _, cid=console_id, j=job: self._retry_job(cid, j))

# NEW:
job = self.ctrl._job_registry.get((console_id, game_name))
if job:
    btn_retry.clicked.connect(lambda _, cid=console_id, j=job: self.ctrl.retry_job(cid, j))
```

Replace `_rename_console` internal logic:

```python
def _rename_console(self) -> None:
    if not self.selected_console:
        return
    new_name, ok = QInputDialog.getText(
        self, "Renombrar consola", "Nombre del cliente:",
        text=self.selected_console.label,
    )
    if not (ok and new_name.strip()):
        return
    new_label = new_name.strip()
    self.ctrl.rename_console(self.selected_console.console_id, new_label)
    # update UI:
    for i in range(self.console_list.count()):
        item = self.console_list.item(i)
        if item.data(Qt.ItemDataRole.UserRole) == self.selected_console.console_id:
            item.setText(f"  {self._console_label(self.selected_console)}")
    row = self._progress_rows.get(self.selected_console.console_id, -1)
    if row >= 0:
        cell = self.progress_table.item(row, 0)
        if cell:
            cell.setText(new_label)
    self._staging_title.setText(f"COLA: {new_label}")
```

Replace `_query_free_space` call in `_on_console_clicked`:

```python
def _on_console_clicked(self, item: QListWidgetItem) -> None:
    console_id = item.data(Qt.ItemDataRole.UserRole)
    self.selected_console = self.ctrl.consoles.get(console_id)
    if self.selected_console:
        self.ctrl.load_catalog(self.selected_console)
        self._refresh_staging_panel()
        self.btn_rename.setEnabled(True)
        self.ctrl.query_free_space(self.selected_console)
```

Replace `_add_console_by_ip` dialog to call controller:

```python
def _add_console_by_ip(self) -> None:
    ip, ok = QInputDialog.getText(
        self, "Agregar consola por IP",
        "Ingresá la IP de la consola\n(la ves en MultiMAN, ej: 192.168.1.105):",
    )
    if not ok or not ip.strip():
        return
    ip = ip.strip()
    parts = ip.split(".")
    if len(parts) != 4 or not all(p.isdigit() and 0 <= int(p) <= 255 for p in parts):
        QMessageBox.warning(self, "IP inválida", f"'{ip}' no es una dirección IP válida.")
        return
    self.ctrl.add_console_by_ip(ip)
```

Update `_on_catalog_ready` to use `self.ctrl.get_staged` instead of `self.staging_manager`:

```python
@pyqtSlot(object, list, str)
def _on_catalog_ready(self, console: ConsoleInfo, games: list, error_msg: str) -> None:
    # ... same as old _populate_catalog but:
    staging_names = {g.name for g in self.ctrl.get_staged(console.console_id)}
    # and btn.clicked uses self.ctrl.stage_game(...)
```

Update `_on_queue_done` — keep only tray notification, remove webMAN/PKG logic (moved to controller):

```python
@pyqtSlot(str, int, int)
def _on_queue_done(self, console_id: str, success_count: int, fail_count: int) -> None:
    row = self._find_row(console_id)
    if row < 0:
        return
    bar = self._safe_widget(row, 2)
    item_name = self._safe_item(row, 1)
    item_vel = self._safe_item(row, 3)
    item_st = self._safe_item(row, 4)
    if bar:
        bar.setValue(100)
    if item_name:
        item_name.setText("Completado")
    if item_vel:
        item_vel.setText("—")
    if item_st:
        status = f"{success_count} cargado(s)"
        if fail_count:
            status += f"  /  {fail_count} con error"
        item_st.setText(status)
    self.progress_table.removeCellWidget(row, 5)
    console = self.ctrl.consoles.get(console_id)
    if console:
        msg = f"{console.label}: carga completa — {success_count} juego(s)"
        if fail_count:
            msg += f", {fail_count} con error"
        self.tray.notify("GameLoader", msg)
```

Update `_safe_quit` to use `ctrl`:

```python
def _safe_quit(self) -> None:
    if self.ctrl.is_transferring():
        active_count = sum(1 for w in self.ctrl.workers.values() if w.isRunning())
        resp = QMessageBox.question(
            self, "Cerrar GameLoader",
            f"Hay {active_count} transferencia(s) activa(s).\n\n"
            "Si cerras ahora los juegos en proceso quedan incompletos "
            "y tendrán que cargarse de nuevo.\n\n"
            "¿Cerrar de todas formas?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No,
        )
        if resp != QMessageBox.StandardButton.Yes:
            return
    self.ctrl.stop_all_workers()
    QApplication.instance().quit()
```

Delete these private methods entirely (logic moved to AppController):
- `_start_scan`
- `_start_health_check`
- `_on_scan_finished` → replaced by new version receiving `int`
- `_query_free_space` → replaced by `ctrl.query_free_space`
- `_populate_catalog` → replaced by `_on_catalog_ready`
- `_add_to_staging`, `_remove_from_staging` → inline in buttons
- `_commit_and_transfer`
- `_preflight_ok`
- `_hen_ok`
- `_ensure_worker_running`
- `_cancel_transfer`
- `_retry_job`
- `_update_eta_status`

Also delete `ManualConnectWorker` class from `main_window.py` (moved to `app_controller.py`).

- [ ] **Step 5: Update `main.py`**

```python
def main():
    app = QApplication(sys.argv)
    app.setApplicationName("GameLoader")
    app.setStyleSheet(APP_STYLE)
    app.setQuitOnLastWindowClosed(False)

    config = load_config()

    try:
        from app_controller import AppController
        ctrl = AppController(config)
        window = MainWindow(ctrl, config)
        window.show()
        ctrl.start_scan()
    except Exception as e:
        QMessageBox.critical(
            None,
            "Error al iniciar GameLoader",
            f"No se pudo abrir la ventana principal:\n\n{e}\n\n"
            "Intenta reinstalar la aplicacion."
        )
        sys.exit(1)

    sys.exit(app.exec())
```

- [ ] **Step 6: Verify line count**

```
python -c "
with open('gameloader/main_window.py') as f:
    lines = f.readlines()
print(f'main_window.py: {len(lines)} lines')
"
```
Expected: < 400 lines

- [ ] **Step 7: Verify no banned imports**

```
python -c "
with open('gameloader/main_window.py') as f:
    src = f.read()
banned = ['FTPWorker', 'ScannerThread', 'WebManClient', 'QueueManager', 'StagingManager']
for b in banned:
    if b in src:
        print(f'FAIL: {b} found in main_window.py')
    else:
        print(f'OK: {b} not in main_window.py')
"
```
Expected: all 5 lines show `OK`

- [ ] **Step 8: Commit**

```
git add gameloader/main_window.py gameloader/main.py gameloader/app_controller.py
git commit -m "refactor: extract AppController, MainWindow is now pure UI (~350 lines)"
```

---

## Task 10: Integration — run full test suite + smoke verification

**Files:** No changes

- [ ] **Step 1: Run the full test suite**

```
pytest gameloader/tests/ -v
```
Expected: all tests pass (existing + 22 new AppController tests)

- [ ] **Step 2: Confirm no import errors in the app**

```
python -c "
import sys, os
sys.path.insert(0, 'gameloader')
from app_controller import AppController
from main_window import MainWindow
print('Imports OK')
"
```
Expected: `Imports OK`

- [ ] **Step 3: Verify Auto Mode config roundtrip**

```
python -c "
from config import load_config, DEFAULT_CONFIG
assert 'auto_mode' in DEFAULT_CONFIG
cfg = load_config()
assert 'auto_mode' in cfg
print('auto_mode config OK')
"
```
Expected: `auto_mode config OK`

- [ ] **Step 4: Final commit**

```
git add -A
git commit -m "test: verify AppController refactor — all tests green, imports clean"
```

---

## Success Criteria Checklist

- [ ] `pytest gameloader/tests/ -v` — all green
- [ ] `main_window.py` < 400 lines
- [ ] `main_window.py` contains none of: `FTPWorker`, `ScannerThread`, `WebManClient`, `QueueManager`, `StagingManager`
- [ ] `AppController` instantiates cleanly
- [ ] `config["auto_mode"] = True` causes console_found → load_catalog → stage all → commit_transfer with zero clicks
- [ ] Manual flow (auto_mode off) works identically to before
