# GameLoader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App de escritorio Windows (PyQt6) que detecta consolas PS3/Xbox en red local y transfiere juegos automáticamente vía FTP sin intervención del usuario.

**Architecture:** Servidor FTP de la consola (MultiMAN en PS3, dashboard en Xbox) recibe archivos desde Python `ftplib`. Un `QThread` por consola corre en paralelo procesando su cola de jobs de forma secuencial. La UI PyQt6 muestra el estado en tiempo real via señales Qt.

**Tech Stack:** Python 3.11+, PyQt6, ftplib (stdlib), socket (stdlib), threading via QThread, PyInstaller para empaquetado.

---

## Estructura de archivos

```
gameloader/
├── main.py              # Entry point, QApplication, wizard de primera vez
├── models.py            # ConsoleInfo, GameEntry, TransferJob, ConsoleType
├── config.py            # load_config() / save_config() con config.json
├── catalog.py           # load_catalog(hdd_root, console_type) -> List[GameEntry]
├── detector.py          # detect_console(ip) -> Optional[ConsoleInfo]
├── scanner.py           # ScannerThread(QThread) - scan red + detecta consolas
├── queue_manager.py     # QueueManager - colas por consola
├── ftp_worker.py        # FTPWorker(QThread) - transferencia con señales de progreso
├── main_window.py       # MainWindow(QMainWindow) - UI de tres paneles
├── tray.py              # SystemTray + set_autostart()
├── requirements.txt     # PyQt6, pyinstaller
└── tests/
    ├── test_config.py
    ├── test_catalog.py
    └── test_queue_manager.py
```

---

## Task 1: Setup del proyecto

**Files:**
- Create: `gameloader/requirements.txt`
- Create: `gameloader/tests/__init__.py`

- [ ] **Step 1: Crear estructura de directorios**

```bash
mkdir -p gameloader/tests
touch gameloader/tests/__init__.py
```

- [ ] **Step 2: Crear requirements.txt**

```
PyQt6>=6.6.0
pyinstaller>=6.0.0
pytest>=8.0.0
```

- [ ] **Step 3: Crear entorno virtual e instalar dependencias**

```bash
cd gameloader
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Expected: `Successfully installed PyQt6-...`

- [ ] **Step 4: Verificar instalación**

```bash
python -c "from PyQt6.QtWidgets import QApplication; print('PyQt6 OK')"
```

Expected: `PyQt6 OK`

- [ ] **Step 5: Commit**

```bash
git add gameloader/requirements.txt gameloader/tests/__init__.py
git commit -m "feat: project scaffold for GameLoader"
```

---

## Task 2: models.py — Tipos de datos

**Files:**
- Create: `gameloader/models.py`

- [ ] **Step 1: Crear models.py**

```python
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path


class ConsoleType(Enum):
    PS3 = "PS3"
    XBOX = "Xbox"


@dataclass
class ConsoleInfo:
    ip: str
    console_type: ConsoleType
    label: str  # ej: "PS3-105", renombrable con nombre del cliente

    @property
    def console_id(self) -> str:
        return self.label


@dataclass
class GameEntry:
    name: str
    local_path: Path
    console_type: ConsoleType


@dataclass
class TransferJob:
    game: GameEntry
    remote_base_path: str  # "/dev_hdd0/GAMES/" o "Hdd1:\\Games\\"
    status: str = "pending"   # pending | transferring | done | failed | skipped
    error_msg: str = ""
```

- [ ] **Step 2: Verificar que importa sin errores**

```bash
python -c "from models import ConsoleInfo, GameEntry, TransferJob, ConsoleType; print('models OK')"
```

Expected: `models OK`

- [ ] **Step 3: Commit**

```bash
git add gameloader/models.py
git commit -m "feat: add data models (ConsoleInfo, GameEntry, TransferJob)"
```

---

## Task 3: config.py — Configuración persistente

**Files:**
- Create: `gameloader/config.py`
- Create: `gameloader/tests/test_config.py`

- [ ] **Step 1: Escribir test que falla**

```python
# tests/test_config.py
import pytest
from pathlib import Path
from config import load_config, save_config

def test_load_config_returns_defaults_when_no_file(tmp_path):
    cfg = load_config(tmp_path / "config.json")
    assert cfg["ps3_remote_path"] == "/dev_hdd0/GAMES/"
    assert cfg["xbox_remote_path"] == "Hdd1:\\Games\\"
    assert cfg["scan_interval_seconds"] == 30
    assert cfg["overwrite_existing"] == False
    assert cfg["hdd_root"] == ""

def test_save_and_load_roundtrip(tmp_path):
    cfg_path = tmp_path / "config.json"
    cfg = load_config(cfg_path)
    cfg["hdd_root"] = "D:\\Juegos"
    save_config(cfg, cfg_path)
    loaded = load_config(cfg_path)
    assert loaded["hdd_root"] == "D:\\Juegos"

def test_load_merges_missing_keys(tmp_path):
    cfg_path = tmp_path / "config.json"
    # Archivo con solo una clave
    import json
    cfg_path.write_text(json.dumps({"hdd_root": "D:\\Juegos"}))
    cfg = load_config(cfg_path)
    # Debe rellenar las demás con defaults
    assert cfg["ps3_remote_path"] == "/dev_hdd0/GAMES/"
    assert cfg["hdd_root"] == "D:\\Juegos"
```

- [ ] **Step 2: Correr tests para verificar que fallan**

```bash
cd gameloader
pytest tests/test_config.py -v
```

Expected: `3 failed` (config module no existe aún)

- [ ] **Step 3: Implementar config.py**

```python
import json
from pathlib import Path

DEFAULT_CONFIG = {
    "hdd_root": "",
    "ps3_remote_path": "/dev_hdd0/GAMES/",
    "xbox_remote_path": "Hdd1:\\Games\\",
    "scan_interval_seconds": 30,
    "autostart_windows": False,
    "overwrite_existing": False,
}

CONFIG_FILE = Path(__file__).parent / "config.json"


def load_config(path: Path = CONFIG_FILE) -> dict:
    if path.exists():
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        return {**DEFAULT_CONFIG, **data}
    return DEFAULT_CONFIG.copy()


def save_config(config: dict, path: Path = CONFIG_FILE) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)
```

- [ ] **Step 4: Correr tests para verificar que pasan**

```bash
pytest tests/test_config.py -v
```

Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add gameloader/config.py gameloader/tests/test_config.py
git commit -m "feat: add config load/save with defaults"
```

---

## Task 4: catalog.py — Lector del catálogo de juegos

**Files:**
- Create: `gameloader/catalog.py`
- Create: `gameloader/tests/test_catalog.py`

- [ ] **Step 1: Escribir tests que fallan**

```python
# tests/test_catalog.py
import pytest
from pathlib import Path
from catalog import load_catalog
from models import ConsoleType

def test_load_ps3_games(tmp_path):
    ps3_dir = tmp_path / "PS3"
    ps3_dir.mkdir()
    game_dir = ps3_dir / "God of War 3"
    game_dir.mkdir()
    (game_dir / "PS3_GAME").mkdir()
    (game_dir / "PS3_GAME" / "PARAM.SFO").write_bytes(b"fake")

    games = load_catalog(str(tmp_path), ConsoleType.PS3)
    assert len(games) == 1
    assert games[0].name == "God of War 3"
    assert games[0].console_type == ConsoleType.PS3
    assert games[0].local_path == game_dir

def test_load_xbox_games(tmp_path):
    xbox_dir = tmp_path / "Xbox"
    xbox_dir.mkdir()
    game_dir = xbox_dir / "GTA V"
    game_dir.mkdir()
    (game_dir / "default.xex").write_bytes(b"fake")

    games = load_catalog(str(tmp_path), ConsoleType.XBOX)
    assert len(games) == 1
    assert games[0].name == "GTA V"
    assert games[0].console_type == ConsoleType.XBOX

def test_empty_game_folder_excluded(tmp_path):
    ps3_dir = tmp_path / "PS3"
    ps3_dir.mkdir()
    (ps3_dir / "Empty Game").mkdir()  # carpeta vacía

    games = load_catalog(str(tmp_path), ConsoleType.PS3)
    assert games == []

def test_missing_console_folder_returns_empty(tmp_path):
    games = load_catalog(str(tmp_path), ConsoleType.PS3)
    assert games == []

def test_games_sorted_alphabetically(tmp_path):
    ps3_dir = tmp_path / "PS3"
    ps3_dir.mkdir()
    for name in ["Zelda", "Assassin's Creed", "Batman"]:
        d = ps3_dir / name
        d.mkdir()
        (d / "file.bin").write_bytes(b"x")

    games = load_catalog(str(tmp_path), ConsoleType.PS3)
    assert [g.name for g in games] == ["Assassin's Creed", "Batman", "Zelda"]
```

- [ ] **Step 2: Correr tests para verificar que fallan**

```bash
pytest tests/test_catalog.py -v
```

Expected: `5 failed`

- [ ] **Step 3: Implementar catalog.py**

```python
from pathlib import Path
from typing import List
from models import GameEntry, ConsoleType


def load_catalog(hdd_root: str, console_type: ConsoleType) -> List[GameEntry]:
    folder_name = "PS3" if console_type == ConsoleType.PS3 else "Xbox"
    base_path = Path(hdd_root) / folder_name

    if not base_path.exists():
        return []

    games = []
    for item in sorted(base_path.iterdir()):
        if item.is_dir() and _has_files(item):
            games.append(GameEntry(
                name=item.name,
                local_path=item,
                console_type=console_type,
            ))
    return games


def _has_files(folder: Path) -> bool:
    return any(True for _ in folder.rglob("*") if _.is_file())
```

- [ ] **Step 4: Correr tests para verificar que pasan**

```bash
pytest tests/test_catalog.py -v
```

Expected: `5 passed`

- [ ] **Step 5: Commit**

```bash
git add gameloader/catalog.py gameloader/tests/test_catalog.py
git commit -m "feat: add game catalog loader from HDD"
```

---

## Task 5: queue_manager.py — Cola de transferencias por consola

**Files:**
- Create: `gameloader/queue_manager.py`
- Create: `gameloader/tests/test_queue_manager.py`

- [ ] **Step 1: Escribir tests que fallan**

```python
# tests/test_queue_manager.py
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
```

- [ ] **Step 2: Correr tests para verificar que fallan**

```bash
pytest tests/test_queue_manager.py -v
```

Expected: `6 failed`

- [ ] **Step 3: Implementar queue_manager.py**

```python
from collections import deque
from typing import Dict, List, Optional
from models import TransferJob


class QueueManager:
    def __init__(self):
        self._queues: Dict[str, deque] = {}

    def add_jobs(self, console_id: str, jobs: List[TransferJob]) -> None:
        if console_id not in self._queues:
            self._queues[console_id] = deque()
        for job in jobs:
            self._queues[console_id].append(job)

    def next_job(self, console_id: str) -> Optional[TransferJob]:
        q = self._queues.get(console_id)
        if q:
            return q.popleft()
        return None

    def clear(self, console_id: str) -> None:
        self._queues[console_id] = deque()

    def pending_count(self, console_id: str) -> int:
        return len(self._queues.get(console_id, []))

    def all_pending(self, console_id: str) -> List[TransferJob]:
        return list(self._queues.get(console_id, []))
```

- [ ] **Step 4: Correr tests para verificar que pasan**

```bash
pytest tests/test_queue_manager.py -v
```

Expected: `6 passed`

- [ ] **Step 5: Correr toda la suite**

```bash
pytest tests/ -v
```

Expected: `14 passed`

- [ ] **Step 6: Commit**

```bash
git add gameloader/queue_manager.py gameloader/tests/test_queue_manager.py
git commit -m "feat: add per-console queue manager"
```

---

## Task 6: detector.py — Identificación de consola por FTP

**Files:**
- Create: `gameloader/detector.py`

> No hay tests automáticos — requiere consola real o mock FTP. Probar manualmente en Task 10.

- [ ] **Step 1: Implementar detector.py**

```python
import ftplib
from typing import Optional
from models import ConsoleInfo, ConsoleType


def detect_console(ip: str) -> Optional[ConsoleInfo]:
    """
    Intenta identificar si la IP es PS3 (MultiMAN) o Xbox RGH.
    Devuelve ConsoleInfo o None si no es ninguna consola conocida.
    """
    # Intentar PS3: MultiMAN usa FTP anónimo, root contiene 'dev_hdd0'
    try:
        ftp = ftplib.FTP()
        ftp.connect(ip, 21, timeout=3)
        ftp.login()  # anónimo
        entries = ftp.nlst()
        ftp.quit()
        if any("dev_hdd0" in e for e in entries):
            last = ip.rsplit(".", 1)[1]
            return ConsoleInfo(ip=ip, console_type=ConsoleType.PS3, label=f"PS3-{last}")
    except Exception:
        pass

    # Intentar Xbox: usuario 'xbox', contraseña 'xbox', root contiene 'Hdd1:'
    try:
        ftp = ftplib.FTP()
        ftp.connect(ip, 21, timeout=3)
        ftp.login("xbox", "xbox")
        entries = ftp.nlst()
        ftp.quit()
        if any("Hdd1" in e for e in entries):
            last = ip.rsplit(".", 1)[1]
            return ConsoleInfo(ip=ip, console_type=ConsoleType.XBOX, label=f"Xbox-{last}")
    except Exception:
        pass

    return None
```

- [ ] **Step 2: Verificar que importa sin errores**

```bash
python -c "from detector import detect_console; print('detector OK')"
```

Expected: `detector OK`

- [ ] **Step 3: Commit**

```bash
git add gameloader/detector.py
git commit -m "feat: add FTP-based console detector (PS3/Xbox)"
```

---

## Task 7: scanner.py — Escaneo de red + thread Qt

**Files:**
- Create: `gameloader/scanner.py`

> No hay tests automáticos — depende de red física. Probar manualmente en Task 10.

- [ ] **Step 1: Implementar scanner.py**

```python
import socket
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List

from PyQt6.QtCore import QThread, pyqtSignal

from detector import detect_console
from models import ConsoleInfo


def get_local_subnet() -> str:
    """Devuelve los primeros 3 octetos de la IP local. Ej: '192.168.1'"""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
    finally:
        s.close()
    return local_ip.rsplit(".", 1)[0]


def scan_for_ftp(subnet: str, timeout: float = 0.3) -> List[str]:
    """Escanea subnet/24 y devuelve IPs con puerto 21 abierto."""
    def check(ip: str):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)
            result = sock.connect_ex((ip, 21))
            sock.close()
            return ip if result == 0 else None
        except Exception:
            return None

    ips = [f"{subnet}.{i}" for i in range(1, 255)]
    found = []
    with ThreadPoolExecutor(max_workers=64) as ex:
        for result in as_completed(ex.submit(check, ip) for ip in ips):
            val = result.result()
            if val:
                found.append(val)
    return sorted(found)


class ScannerThread(QThread):
    console_found = pyqtSignal(object)  # emite ConsoleInfo
    scan_finished = pyqtSignal()

    def run(self):
        subnet = get_local_subnet()
        ips = scan_for_ftp(subnet)
        for ip in ips:
            console = detect_console(ip)
            if console:
                self.console_found.emit(console)
        self.scan_finished.emit()
```

- [ ] **Step 2: Verificar que importa sin errores**

```bash
python -c "from scanner import ScannerThread, get_local_subnet; print('scanner OK')"
```

Expected: `scanner OK`

- [ ] **Step 3: Commit**

```bash
git add gameloader/scanner.py
git commit -m "feat: add parallel network scanner with Qt thread"
```

---

## Task 8: ftp_worker.py — Worker de transferencia FTP

**Files:**
- Create: `gameloader/ftp_worker.py`

> No hay tests automáticos — depende de consola física. Probar manualmente en Task 10.

- [ ] **Step 1: Implementar ftp_worker.py**

```python
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
                remote_dest = f"{job.remote_base_path}{job.game.name}"

                if self._remote_exists(ftp, remote_dest) and not self.overwrite:
                    ftp.quit()
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
                ftp.quit()

                self.job_done.emit(self.console.console_id, job.game.name, True, "")
                success_count += 1

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
```

- [ ] **Step 2: Verificar que importa sin errores**

```bash
python -c "from ftp_worker import FTPWorker; print('ftp_worker OK')"
```

Expected: `ftp_worker OK`

- [ ] **Step 3: Commit**

```bash
git add gameloader/ftp_worker.py
git commit -m "feat: add FTPWorker QThread with progress signals and error handling"
```

---

## Task 9: tray.py — Bandeja del sistema

**Files:**
- Create: `gameloader/tray.py`

- [ ] **Step 1: Implementar tray.py**

```python
import sys
import winreg
from PyQt6.QtWidgets import QSystemTrayIcon, QMenu, QApplication
from PyQt6.QtGui import QIcon, QPixmap, QColor
from PyQt6.QtCore import QObject, pyqtSignal


class SystemTray(QObject):
    show_window = pyqtSignal()
    quit_app = pyqtSignal()

    def __init__(self, app: QApplication, parent=None):
        super().__init__(parent)

        # Ícono simple verde si no hay .ico
        pixmap = QPixmap(32, 32)
        pixmap.fill(QColor("#1a6b35"))
        icon = QIcon(pixmap)

        self._tray = QSystemTrayIcon(icon, app)
        self._tray.setToolTip("GameLoader")

        menu = QMenu()
        menu.addAction("Abrir GameLoader", self.show_window.emit)
        menu.addSeparator()
        menu.addAction("Salir", self.quit_app.emit)
        self._tray.setContextMenu(menu)
        self._tray.activated.connect(self._on_activated)
        self._tray.show()

    def _on_activated(self, reason):
        if reason == QSystemTrayIcon.ActivationReason.DoubleClick:
            self.show_window.emit()

    def notify(self, title: str, message: str) -> None:
        self._tray.showMessage(title, message,
                               QSystemTrayIcon.MessageIcon.Information, 5000)


def set_autostart(enabled: bool) -> None:
    """Agrega o elimina GameLoader del inicio automático de Windows."""
    key_path = r"Software\Microsoft\Windows\CurrentVersion\Run"
    app_path = sys.executable  # ruta al .exe cuando se empaqueta con PyInstaller
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_SET_VALUE)
        if enabled:
            winreg.SetValueEx(key, "GameLoader", 0, winreg.REG_SZ, f'"{app_path}"')
        else:
            try:
                winreg.DeleteValue(key, "GameLoader")
            except FileNotFoundError:
                pass
        winreg.CloseKey(key)
    except Exception:
        pass
```

- [ ] **Step 2: Verificar que importa sin errores**

```bash
python -c "from tray import SystemTray, set_autostart; print('tray OK')"
```

Expected: `tray OK`

- [ ] **Step 3: Commit**

```bash
git add gameloader/tray.py
git commit -m "feat: add system tray with notifications and autostart toggle"
```

---

## Task 10: main_window.py — Ventana principal PyQt6

**Files:**
- Create: `gameloader/main_window.py`

- [ ] **Step 1: Implementar main_window.py**

```python
from typing import Dict, List, Optional

from PyQt6.QtCore import Qt, QTimer, pyqtSlot
from PyQt6.QtGui import QColor, QFont
from PyQt6.QtWidgets import (
    QFrame, QHeaderView, QHBoxLayout, QInputDialog, QLabel,
    QLineEdit, QListWidget, QListWidgetItem, QMainWindow,
    QProgressBar, QPushButton, QSplitter, QTableWidget,
    QTableWidgetItem, QVBoxLayout, QWidget, QApplication,
)

from catalog import load_catalog
from ftp_worker import FTPWorker
from models import ConsoleInfo, ConsoleType, GameEntry, TransferJob
from queue_manager import QueueManager
from scanner import ScannerThread
from tray import SystemTray, set_autostart


class MainWindow(QMainWindow):
    def __init__(self, config: dict):
        super().__init__()
        self.config = config
        self.consoles: Dict[str, ConsoleInfo] = {}
        self.workers: Dict[str, FTPWorker] = {}
        self.queue_manager = QueueManager()
        self.selected_console: Optional[ConsoleInfo] = None

        self._setup_ui()
        self._setup_tray()
        self._start_scan()

        self._scan_timer = QTimer(self)
        self._scan_timer.timeout.connect(self._start_scan)
        self._scan_timer.start(config.get("scan_interval_seconds", 30) * 1000)

    # ------------------------------------------------------------------
    # UI setup
    # ------------------------------------------------------------------

    def _setup_ui(self):
        self.setWindowTitle("🎮 GameLoader")
        self.setMinimumSize(800, 580)
        self.resize(940, 660)

        central = QWidget()
        self.setCentralWidget(central)
        layout = QVBoxLayout(central)
        layout.setContentsMargins(8, 8, 8, 8)
        layout.setSpacing(6)

        splitter = QSplitter(Qt.Orientation.Horizontal)

        # ── Left: consolas ──────────────────────────────────────────
        left = QWidget()
        left_layout = QVBoxLayout(left)
        left_layout.addWidget(self._bold_label("CONSOLAS DETECTADAS"))

        self.console_list = QListWidget()
        self.console_list.itemClicked.connect(self._on_console_clicked)
        left_layout.addWidget(self.console_list)

        self.btn_scan = QPushButton("🔍 Buscar consolas")
        self.btn_scan.clicked.connect(self._start_scan)
        left_layout.addWidget(self.btn_scan)

        self.btn_rename = QPushButton("✏️ Renombrar")
        self.btn_rename.setEnabled(False)
        self.btn_rename.clicked.connect(self._rename_console)
        left_layout.addWidget(self.btn_rename)

        # ── Right: catálogo ─────────────────────────────────────────
        right = QWidget()
        right_layout = QVBoxLayout(right)
        right_layout.addWidget(self._bold_label("CATÁLOGO DE JUEGOS"))

        self.search_box = QLineEdit()
        self.search_box.setPlaceholderText("🔍 Buscar...")
        self.search_box.textChanged.connect(self._filter_catalog)
        right_layout.addWidget(self.search_box)

        self.game_list = QListWidget()
        right_layout.addWidget(self.game_list)

        self.btn_load = QPushButton("▶ Cargar juegos")
        self.btn_load.setEnabled(False)
        self.btn_load.clicked.connect(self._enqueue_transfer)
        right_layout.addWidget(self.btn_load)

        splitter.addWidget(left)
        splitter.addWidget(right)
        splitter.setSizes([260, 560])

        # ── Bottom: progreso ────────────────────────────────────────
        progress_frame = QFrame()
        progress_frame.setFrameShape(QFrame.Shape.StyledPanel)
        pf_layout = QVBoxLayout(progress_frame)
        pf_layout.addWidget(self._bold_label("PROGRESO"))

        self.progress_table = QTableWidget(0, 4)
        self.progress_table.setHorizontalHeaderLabels(
            ["Consola", "Juego actual", "Progreso", "Estado"]
        )
        hh = self.progress_table.horizontalHeader()
        hh.setSectionResizeMode(0, QHeaderView.ResizeMode.ResizeToContents)
        hh.setSectionResizeMode(1, QHeaderView.ResizeMode.Stretch)
        hh.setSectionResizeMode(2, QHeaderView.ResizeMode.Fixed)
        hh.setSectionResizeMode(3, QHeaderView.ResizeMode.ResizeToContents)
        self.progress_table.setColumnWidth(2, 180)
        self.progress_table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        self.progress_table.setSelectionMode(QTableWidget.SelectionMode.NoSelection)
        pf_layout.addWidget(self.progress_table)

        layout.addWidget(splitter, stretch=2)
        layout.addWidget(progress_frame, stretch=1)

    def _bold_label(self, text: str) -> QLabel:
        lbl = QLabel(text)
        font = lbl.font()
        font.setBold(True)
        lbl.setFont(font)
        return lbl

    def _setup_tray(self):
        self.tray = SystemTray(QApplication.instance(), self)
        self.tray.show_window.connect(self.show)
        self.tray.quit_app.connect(QApplication.instance().quit)

    def closeEvent(self, event):
        event.ignore()
        self.hide()

    # ------------------------------------------------------------------
    # Scanner
    # ------------------------------------------------------------------

    def _start_scan(self):
        self.btn_scan.setEnabled(False)
        self.btn_scan.setText("🔍 Buscando...")
        self._scanner = ScannerThread(self)
        self._scanner.console_found.connect(self._on_console_found)
        self._scanner.scan_finished.connect(self._on_scan_finished)
        self._scanner.start()

    @pyqtSlot(object)
    def _on_console_found(self, console: ConsoleInfo):
        if console.console_id not in self.consoles:
            self.consoles[console.console_id] = console
            item = QListWidgetItem(f"🟢 {console.label}")
            item.setData(Qt.ItemDataRole.UserRole, console.console_id)
            self.console_list.addItem(item)

    @pyqtSlot()
    def _on_scan_finished(self):
        self.btn_scan.setEnabled(True)
        self.btn_scan.setText("🔍 Buscar consolas")

    # ------------------------------------------------------------------
    # Consola seleccionada
    # ------------------------------------------------------------------

    def _on_console_clicked(self, item: QListWidgetItem):
        console_id = item.data(Qt.ItemDataRole.UserRole)
        self.selected_console = self.consoles.get(console_id)
        if self.selected_console:
            self._populate_catalog(self.selected_console)
            self.btn_rename.setEnabled(True)
            self.btn_load.setEnabled(True)
            self.btn_load.setText(f"▶ Cargar a {self.selected_console.label}")

    def _populate_catalog(self, console: ConsoleInfo):
        self.game_list.clear()
        self.search_box.clear()
        for game in load_catalog(self.config["hdd_root"], console.console_type):
            item = QListWidgetItem(game.name)
            item.setCheckState(Qt.CheckState.Unchecked)
            item.setData(Qt.ItemDataRole.UserRole, game)
            self.game_list.addItem(item)

    def _filter_catalog(self, text: str):
        for i in range(self.game_list.count()):
            item = self.game_list.item(i)
            item.setHidden(text.lower() not in item.text().lower())

    def _rename_console(self):
        if not self.selected_console:
            return
        new_name, ok = QInputDialog.getText(
            self, "Renombrar consola", "Nombre del cliente:",
            text=self.selected_console.label,
        )
        if ok and new_name.strip():
            old_id = self.selected_console.console_id
            self.selected_console.label = new_name.strip()
            for i in range(self.console_list.count()):
                item = self.console_list.item(i)
                if item.data(Qt.ItemDataRole.UserRole) == old_id:
                    item.setText(f"🟢 {new_name.strip()}")
            self.btn_load.setText(f"▶ Cargar a {new_name.strip()}")

    # ------------------------------------------------------------------
    # Transferencia
    # ------------------------------------------------------------------

    def _enqueue_transfer(self):
        if not self.selected_console:
            return

        games: List[GameEntry] = []
        for i in range(self.game_list.count()):
            item = self.game_list.item(i)
            if item.checkState() == Qt.CheckState.Checked:
                games.append(item.data(Qt.ItemDataRole.UserRole))

        if not games:
            return

        console = self.selected_console
        remote_base = (
            self.config["ps3_remote_path"]
            if console.console_type == ConsoleType.PS3
            else self.config["xbox_remote_path"]
        )
        jobs = [TransferJob(game=g, remote_base_path=remote_base) for g in games]
        self.queue_manager.add_jobs(console.console_id, jobs)
        self._ensure_worker_running(console)

        # Desmarcar todos los checkboxes
        for i in range(self.game_list.count()):
            self.game_list.item(i).setCheckState(Qt.CheckState.Unchecked)

    def _ensure_worker_running(self, console: ConsoleInfo):
        existing = self.workers.get(console.console_id)
        if existing and existing.isRunning():
            return  # ya está corriendo, el job se encoló y se procesará solo

        worker = FTPWorker(
            console=console,
            queue=self.queue_manager,
            overwrite=self.config.get("overwrite_existing", False),
        )
        worker.progress.connect(self._on_progress)
        worker.job_done.connect(self._on_job_done)
        worker.queue_done.connect(self._on_queue_done)
        self.workers[console.console_id] = worker

        self._upsert_progress_row(console)
        worker.start()

    # ------------------------------------------------------------------
    # Progreso
    # ------------------------------------------------------------------

    def _upsert_progress_row(self, console: ConsoleInfo):
        for row in range(self.progress_table.rowCount()):
            if self.progress_table.item(row, 0).text() == console.label:
                return  # ya existe
        row = self.progress_table.rowCount()
        self.progress_table.insertRow(row)
        self.progress_table.setItem(row, 0, QTableWidgetItem(console.label))
        self.progress_table.setItem(row, 1, QTableWidgetItem("Iniciando..."))
        bar = QProgressBar()
        bar.setRange(0, 100)
        bar.setValue(0)
        self.progress_table.setCellWidget(row, 2, bar)
        self.progress_table.setItem(row, 3, QTableWidgetItem("En cola"))

    def _find_row(self, console_id: str) -> int:
        console = self.consoles.get(console_id)
        if not console:
            return -1
        for row in range(self.progress_table.rowCount()):
            if self.progress_table.item(row, 0).text() == console.label:
                return row
        return -1

    @pyqtSlot(str, str, int, int)
    def _on_progress(self, console_id: str, game_name: str, bytes_sent: int, total_bytes: int):
        row = self._find_row(console_id)
        if row == -1:
            return
        self.progress_table.item(row, 1).setText(game_name)
        if total_bytes > 0:
            pct = int(bytes_sent * 100 / total_bytes)
            self.progress_table.cellWidget(row, 2).setValue(pct)
            mb_s = bytes_sent / 1_048_576
            mb_t = total_bytes / 1_048_576
            self.progress_table.item(row, 3).setText(f"{mb_s:.1f} / {mb_t:.1f} MB")

    @pyqtSlot(str, str, bool, str)
    def _on_job_done(self, console_id: str, game_name: str, success: bool, error_msg: str):
        row = self._find_row(console_id)
        if row == -1:
            return
        if success and error_msg == "skipped":
            self.progress_table.item(row, 3).setText(f"↷ Saltado: {game_name}")
        elif success:
            self.progress_table.item(row, 3).setText(f"✓ {game_name}")
        else:
            self.progress_table.item(row, 1).setText(f"❌ {game_name}")
            self.progress_table.item(row, 3).setText(f"Error: {error_msg[:40]}")

    @pyqtSlot(str, int, int)
    def _on_queue_done(self, console_id: str, success_count: int, fail_count: int):
        row = self._find_row(console_id)
        if row != -1:
            self.progress_table.cellWidget(row, 2).setValue(100)
            status = f"✅ {success_count} cargado(s)"
            if fail_count:
                status += f"  ❌ {fail_count} fallido(s)"
            self.progress_table.item(row, 3).setText(status)

        console = self.consoles.get(console_id)
        if console:
            self.tray.notify(
                "GameLoader",
                f"{console.label}: ¡Carga completa! {success_count} juego(s)"
                + (f", {fail_count} fallido(s)" if fail_count else ""),
            )
```

- [ ] **Step 2: Verificar que importa sin errores**

```bash
python -c "from main_window import MainWindow; print('main_window OK')"
```

Expected: `main_window OK`

- [ ] **Step 3: Commit**

```bash
git add gameloader/main_window.py
git commit -m "feat: add main window with 3-panel UI, catalog, progress table"
```

---

## Task 11: main.py — Entry point y wizard de primera vez

**Files:**
- Create: `gameloader/main.py`

- [ ] **Step 1: Implementar main.py**

```python
import sys
from PyQt6.QtWidgets import QApplication, QFileDialog, QMessageBox
from config import load_config, save_config
from main_window import MainWindow


def run_setup_wizard() -> str:
    QMessageBox.information(
        None,
        "GameLoader — Configuración inicial",
        "Bienvenido a GameLoader.\n\n"
        "Seleccioná la carpeta raíz donde guardás tus juegos.\n"
        "Debe contener subcarpetas llamadas 'PS3' y 'Xbox'.",
    )
    return QFileDialog.getExistingDirectory(None, "Seleccionar carpeta de juegos")


def main():
    app = QApplication(sys.argv)
    app.setApplicationName("GameLoader")
    app.setQuitOnLastWindowClosed(False)  # Seguir corriendo en bandeja

    config = load_config()

    if not config["hdd_root"]:
        folder = run_setup_wizard()
        if not folder:
            sys.exit(0)
        config["hdd_root"] = folder
        save_config(config)

    window = MainWindow(config)
    window.show()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Ejecutar la app y verificar que arranca**

```bash
python main.py
```

Expected: ventana de GameLoader se abre, wizard de primer uso si no hay config.json.

- [ ] **Step 3: Probar flujo completo manualmente**

Checklist de prueba manual:
- [ ] App arranca y pide carpeta raíz (primer uso)
- [ ] Segunda apertura: no pide carpeta, abre directo
- [ ] Conectar consola PS3 con MultiMAN activo → aparece en lista como `PS3-XXX`
- [ ] Click en PS3 → catálogo muestra juegos de `HDD_ROOT/PS3/`
- [ ] Buscar juego → filtro funciona
- [ ] Marcar 2-3 juegos → click "Cargar a PS3-XXX" → barra de progreso se actualiza
- [ ] Cuando termina → notificación en bandeja del sistema
- [ ] Cerrar ventana → app sigue en bandeja
- [ ] Click en ícono de bandeja → ventana vuelve
- [ ] Renombrar consola → nombre se actualiza en lista y botón

- [ ] **Step 4: Commit**

```bash
git add gameloader/main.py
git commit -m "feat: add entry point with first-run setup wizard"
```

---

## Task 12: Empaquetar como .exe con PyInstaller

**Files:**
- Create: `gameloader/gameloader.spec` (generado por PyInstaller)

- [ ] **Step 1: Ejecutar PyInstaller en modo onefile**

```bash
cd gameloader
pyinstaller --onefile --windowed --name GameLoader main.py
```

Expected: crea `dist/GameLoader.exe`

- [ ] **Step 2: Probar el .exe generado**

```bash
dist\GameLoader.exe
```

Expected: app abre igual que con `python main.py`. Sin consola de terminal al fondo.

- [ ] **Step 3: Agregar .gitignore para artefactos de build**

Crear `gameloader/.gitignore`:
```
venv/
__pycache__/
*.pyc
build/
dist/
*.spec
config.json
```

- [ ] **Step 4: Commit final**

```bash
git add gameloader/.gitignore
git commit -m "chore: add .gitignore for build artifacts"
```

---

## Resumen de tareas

| # | Módulo | Tests | Depende de |
|---|--------|-------|------------|
| 1 | Project setup | — | — |
| 2 | models.py | — | 1 |
| 3 | config.py | ✅ 3 tests | 2 |
| 4 | catalog.py | ✅ 5 tests | 2 |
| 5 | queue_manager.py | ✅ 6 tests | 2 |
| 6 | detector.py | manual | 2 |
| 7 | scanner.py | manual | 6 |
| 8 | ftp_worker.py | manual | 5, 6 |
| 9 | tray.py | manual | — |
| 10 | main_window.py | manual | 4,5,7,8,9 |
| 11 | main.py | manual E2E | 3, 10 |
| 12 | PyInstaller | E2E | 11 |
