# GameLoader — AppController Refactor & Auto Mode
**Date:** 2026-05-01
**Branch:** feat/conectores-reales

---

## Objetivo

Separar la lógica de negocio de la UI extrayendo `AppController` de `MainWindow`. Esto permite:
1. Automatizar el flujo completo desde detección de IP hasta transferencia sin intervención humana
2. Reducir `MainWindow` a pura presentación (~350 líneas)
3. Habilitar futuros modos headless y watch-folder

---

## Arquitectura

```
main.py
  ├── AppController(QObject)   ← gameloader/app_controller.py  [NUEVO]
  └── MainWindow(QMainWindow)  ← gameloader/main_window.py     [REFACTORIZADO]
        recibe ctrl como parámetro, no instancia workers propios
```

### Regla de comunicación (unidireccional)

```
AppController  ──pyqtSignal──▶  MainWindow   (actualiza display)
MainWindow     ──método()────▶  AppController (usuario hizo acción)
```

`MainWindow` no importa `FTPWorker`, `ScannerThread`, `WebManClient`, `QueueManager`,
`StagingManager`, `FreeSpaceWorker`, ni `CatalogSizeWorker`. Solo importa `AppController`.

---

## AppController

### Estado que posee

```python
config: dict
consoles: Dict[str, ConsoleInfo]
workers: Dict[str, FTPWorker]
queue_manager: QueueManager
staging_manager: StagingManager
_console_online: Dict[str, bool]
_job_totals: Dict[str, int]
_job_done_count: Dict[str, int]
_job_registry: Dict[Tuple[str, str], TransferJob]
_latest_eta_data: Dict[str, Tuple[int, float]]
_free_space_cache: Dict[str, float]
_game_size_cache: Dict[str, int]
_batch_has_pkg: Dict[str, list]
_webman_post_workers: Dict[str, QThread]
_pkg_install_workers: Dict[str, QThread]
```

### Señales emitidas hacia la UI

```python
console_found     = pyqtSignal(object)            # ConsoleInfo
console_online    = pyqtSignal(str)               # console_id
console_offline   = pyqtSignal(str)               # console_id
scan_started      = pyqtSignal()
scan_finished     = pyqtSignal(int)               # n consolas

catalog_ready     = pyqtSignal(object, list, str) # console, games, error_msg
game_size_ready   = pyqtSignal(str, int)          # game_name, bytes
free_space_ready  = pyqtSignal(str, float)        # console_id, gb

transfer_progress = pyqtSignal(str, str, int, int, float)  # console_id, game, sent, total, mbps
transfer_done     = pyqtSignal(str, str, str)     # console_id, game, note
transfer_failed   = pyqtSignal(str, str, str)     # console_id, game, error_msg
transfer_retry    = pyqtSignal(str, str, int)     # console_id, game, attempt
queue_done        = pyqtSignal(str, int, int)     # console_id, ok, fail

hen_required      = pyqtSignal(str, bool)         # console_ip, has_webman
space_warning     = pyqtSignal(str, float, float) # console_id, needed_gb, free_gb
status_message    = pyqtSignal(str)
```

### Métodos públicos (llamados por MainWindow)

```python
# Escaneo
def start_scan(self) -> None
def add_console_by_ip(self, ip: str) -> None

# Catálogo
def load_catalog(self, console: ConsoleInfo) -> None
def query_free_space(self, console: ConsoleInfo) -> None

# Staging
def stage_game(self, console_id: str, game: GameEntry) -> None
def unstage_game(self, console_id: str, index: int) -> None
def get_staged(self, console_id: str) -> List[GameEntry]

# Transferencia
def commit_transfer(self, console_id: str) -> None   # preflight + HEN + encolar + arrancar
def cancel_transfer(self, console_id: str) -> None
def retry_job(self, console_id: str, job: TransferJob) -> None
def hen_confirmed(self, console_ip: str) -> None     # UI llama esto post-guía HEN
def commit_transfer_confirmed(self, console_id: str) -> None  # UI llama esto si acepta space_warning

# Consola
def rename_console(self, console_id: str, new_label: str) -> None
def update_config(self, config: dict) -> None
def is_transferring(self) -> bool                    # para confirmar cierre
def stop_all_workers(self) -> None                   # para shutdown limpio
```

### Flujo interno de `commit_transfer`

```
commit_transfer(console_id)
  │
  ├─ _preflight_ok()  → falla → emite status_message con error, return
  │
  ├─ _hen_ok()        → falla → emite hen_required(ip, has_webman), return
  │                              (UI muestra HenGuideDialog, luego llama hen_confirmed())
  │
  ├─ construye TransferJob[] desde staging
  │     detect_format() por cada juego PS3
  │     remote_path_for_format() según config
  │
  ├─ calcula espacio total vs free_space_cache
  │     si > 95% espacio libre → emite space_warning → UI pide confirmación
  │                              (UI llama commit_transfer_confirmed() si acepta)
  │
  ├─ queue_manager.add_jobs()
  │
  └─ _ensure_worker_running()
```

---

## Auto Mode

**Config key:** `"auto_mode": false` (default off)

Cuando `auto_mode = True`:

```
console_found(console)
  │
  ├─ load_catalog(console)          ← automático
  │
  │  on catalog_ready:
  ├─ stage_game() para cada juego   ← automático
  │
  └─ commit_transfer(console_id)    ← automático
       │
       ├─ si HEN falla → emite hen_required → UI guía al usuario
       │                 (única intervención humana posible)
       │
       └─ si todo OK → transfiere sin ningún click
```

Auto Mode se activa desde `SettingsDialog` con un toggle visible.
Cuando está activo, la barra de estado muestra "Modo automático activo".

---

## MainWindow refactorizada

Recibe `AppController` en `__init__`. Al inicializar:

```python
def __init__(self, ctrl: AppController, config: dict):
    self.ctrl = ctrl
    self._setup_ui()
    self._setup_tray()
    self._connect_controller_signals()   # conecta todas las señales del ctrl

def _connect_controller_signals(self):
    self.ctrl.console_found.connect(self._on_console_found)
    self.ctrl.scan_finished.connect(self._on_scan_finished)
    self.ctrl.catalog_ready.connect(self._on_catalog_ready)
    self.ctrl.transfer_progress.connect(self._on_progress)
    self.ctrl.transfer_done.connect(self._on_job_done)
    self.ctrl.transfer_failed.connect(self._on_job_failed)
    self.ctrl.queue_done.connect(self._on_queue_done)
    self.ctrl.hen_required.connect(self._on_hen_required)
    self.ctrl.space_warning.connect(self._on_space_warning)
    self.ctrl.status_message.connect(self._status)
    # ... resto de señales
```

Todos los clicks de botones llaman a métodos del controller:
```python
self.btn_scan.clicked.connect(self.ctrl.start_scan)
self.btn_start_transfer.clicked.connect(
    lambda: self.ctrl.commit_transfer(self.selected_console_id)
)
```

`MainWindow` no tiene `QueueManager`, `StagingManager`, ni `workers` propios.

---

## main.py

```python
def main():
    app = QApplication(sys.argv)
    config = load_config()
    if not config.get("ps3_root") and not config.get("xbox_root"):
        # wizard primera vez
        ...
    ctrl = AppController(config)
    window = MainWindow(ctrl, config)
    window.show()
    ctrl.start_scan()       # arrancar escaneo al inicio
    sys.exit(app.exec())
```

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `gameloader/app_controller.py` | NUEVO — extrae lógica de main_window.py |
| `gameloader/main_window.py` | REFACTORIZADO — solo UI, ~350 líneas |
| `gameloader/main.py` | Instancia AppController, pasa a MainWindow |
| `gameloader/tests/test_app_controller.py` | NUEVO — tests sin UI |

Archivos sin cambios: `ftp_worker.py`, `queue_manager.py`, `staging_manager.py`,
`scanner.py`, `detector.py`, `catalog.py`, `config.py`, `format_detector.py`,
`models.py`, `webman.py`, `tray.py`, `settings_dialog.py`, `hen_guide_dialog.py`,
`pkg_guide_dialog.py`.

---

## Tests nuevos (`test_app_controller.py`)

```python
test_start_scan_launches_scanner_thread()
test_console_found_emits_signal()
test_auto_mode_queues_all_on_detection()
test_commit_transfer_preflight_fail_emits_status()
test_commit_transfer_hen_fail_emits_hen_required()
test_cancel_transfer_stops_worker_and_clears_queue()
test_rename_console_updates_label()
test_update_config_restarts_scan_timer()
```

---

## Criterios de éxito

1. `pytest gameloader/tests/ -v` pasa en verde (tests existentes + nuevos)
2. `main_window.py` < 400 líneas
3. `main_window.py` no importa `FTPWorker`, `ScannerThread`, `WebManClient`, `QueueManager`, `StagingManager`
4. Con `auto_mode: true` en config, conectar una consola transfiere todos los juegos sin ningún click
5. Sin `auto_mode`, el flujo manual existente funciona igual que antes
