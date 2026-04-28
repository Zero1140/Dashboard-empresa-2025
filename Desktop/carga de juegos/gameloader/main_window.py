from typing import Dict, List, Optional, Tuple

from PyQt6.QtCore import Qt, QTimer, pyqtSlot
from PyQt6.QtGui import QAction
from PyQt6.QtWidgets import (
    QApplication, QFrame, QHeaderView, QInputDialog, QLabel,
    QLineEdit, QListWidget, QListWidgetItem, QMainWindow,
    QMessageBox, QProgressBar, QPushButton, QSplitter,
    QTableWidget, QTableWidgetItem, QVBoxLayout, QHBoxLayout, QWidget,
    QMenuBar,
)

from catalog import load_catalog
from config import save_config
from ftp_worker import FTPWorker, MAX_RETRIES
from models import ConsoleInfo, ConsoleType, GameEntry, TransferJob
from queue_manager import QueueManager
from scanner import ScannerThread
from settings_dialog import SettingsDialog
from staging_manager import StagingManager
from tray import SystemTray, set_autostart


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

        self._setup_ui()
        self._setup_tray()
        self._start_scan()

        self._scan_timer = QTimer(self)
        self._scan_timer.timeout.connect(self._start_scan)
        self._scan_timer.start(config.get("scan_interval_seconds", 30) * 1000)

        self._eta_timer = QTimer(self)
        self._eta_timer.timeout.connect(self._update_eta_status)
        self._eta_timer.start(1000)

    # ------------------------------------------------------------------
    # Menú
    # ------------------------------------------------------------------

    def _setup_menu(self):
        mb = QMenuBar(self)
        self.setMenuBar(mb)
        menu = mb.addMenu("&Archivo")

        act_settings = QAction("⚙️  Configuración...", self)
        act_settings.triggered.connect(self._open_settings)
        menu.addAction(act_settings)

        menu.addSeparator()

        act_quit = QAction("Salir", self)
        act_quit.triggered.connect(QApplication.instance().quit)
        menu.addAction(act_quit)

    def _open_settings(self):
        dlg = SettingsDialog(self.config, self)
        if dlg.exec() != SettingsDialog.DialogCode.Accepted:
            return
        new_cfg = dlg.get_config()

        autostart_changed = new_cfg["autostart_windows"] != self.config.get("autostart_windows", False)
        interval_changed = new_cfg["scan_interval_seconds"] != self.config.get("scan_interval_seconds", 30)
        root_changed = new_cfg["hdd_root"] != self.config.get("hdd_root", "")

        self.config = new_cfg
        if not save_config(self.config):
            self._status("⚠️ No se pudo guardar la configuración (disco lleno o sin permisos)")

        if autostart_changed:
            ok = set_autostart(new_cfg["autostart_windows"])
            if not ok and new_cfg["autostart_windows"]:
                QMessageBox.warning(
                    self, "Inicio automático",
                    "No se pudo configurar el inicio automático con Windows.\n"
                    "Intentá ejecutar GameLoader como administrador."
                )

        if interval_changed:
            self._scan_timer.setInterval(new_cfg["scan_interval_seconds"] * 1000)

        if root_changed and self.selected_console:
            self._populate_catalog(self.selected_console)

    # ------------------------------------------------------------------
    # UI setup
    # ------------------------------------------------------------------

    def _setup_ui(self):
        self.setWindowTitle("🎮 GameLoader")
        self.setMinimumSize(1000, 600)
        self.resize(1100, 700)
        self._setup_menu()

        central = QWidget()
        self.setCentralWidget(central)
        layout = QVBoxLayout(central)
        layout.setContentsMargins(8, 8, 8, 8)
        layout.setSpacing(6)

        splitter = QSplitter(Qt.Orientation.Horizontal)

        # ── Left: consolas ──────────────────────────────────────────────
        left = QWidget()
        left_layout = QVBoxLayout(left)
        left_layout.addWidget(self._bold_label("CONSOLAS"))

        self.console_list = QListWidget()
        self.console_list.itemClicked.connect(self._on_console_clicked)
        left_layout.addWidget(self.console_list)

        self.btn_scan = QPushButton("🔍 Buscar")
        self.btn_scan.clicked.connect(self._start_scan)
        left_layout.addWidget(self.btn_scan)

        self.btn_rename = QPushButton("✏️ Renombrar")
        self.btn_rename.setEnabled(False)
        self.btn_rename.clicked.connect(self._rename_console)
        left_layout.addWidget(self.btn_rename)

        # ── Center: catálogo ────────────────────────────────────────────
        center = QWidget()
        center_layout = QVBoxLayout(center)
        center_layout.addWidget(self._bold_label("CATÁLOGO"))

        self.search_box = QLineEdit()
        self.search_box.setPlaceholderText("🔍 Buscar...")
        self.search_box.textChanged.connect(self._filter_catalog)
        center_layout.addWidget(self.search_box)

        self._catalog_table = QTableWidget(0, 2)
        self._catalog_table.horizontalHeader().hide()
        self._catalog_table.verticalHeader().hide()
        self._catalog_table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        self._catalog_table.setSelectionMode(QTableWidget.SelectionMode.NoSelection)
        self._catalog_table.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeMode.Stretch)
        self._catalog_table.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeMode.Fixed)
        self._catalog_table.setColumnWidth(1, 46)
        self._catalog_table.setShowGrid(False)
        center_layout.addWidget(self._catalog_table)

        self._catalog_hint = QLabel("")
        self._catalog_hint.setWordWrap(True)
        self._catalog_hint.setStyleSheet("color: #888; font-style: italic; padding: 4px;")
        self._catalog_hint.hide()
        center_layout.addWidget(self._catalog_hint)

        # ── Right: staging ──────────────────────────────────────────────
        right = QWidget()
        right_layout = QVBoxLayout(right)
        self._staging_title = self._bold_label("COLA: —")
        right_layout.addWidget(self._staging_title)

        self._staging_list = QListWidget()
        right_layout.addWidget(self._staging_list)

        self._staging_info = QLabel("0 juegos · ~0.0 GB")
        self._staging_info.setStyleSheet("color: #888; font-style: italic; padding: 4px;")
        right_layout.addWidget(self._staging_info)

        self.btn_start_transfer = QPushButton("▶ INICIAR CARGA")
        self.btn_start_transfer.setEnabled(False)
        self.btn_start_transfer.clicked.connect(self._commit_and_transfer)
        right_layout.addWidget(self.btn_start_transfer)

        splitter.addWidget(left)
        splitter.addWidget(center)
        splitter.addWidget(right)
        splitter.setSizes([200, 500, 280])

        # ── Bottom: progreso ────────────────────────────────────────────
        progress_frame = QFrame()
        progress_frame.setFrameShape(QFrame.Shape.StyledPanel)
        pf_layout = QVBoxLayout(progress_frame)
        pf_layout.addWidget(self._bold_label("TRANSFERENCIAS ACTIVAS"))

        self.progress_table = QTableWidget(0, 6)
        self.progress_table.setHorizontalHeaderLabels(
            ["Consola", "Juego", "Progreso", "Vel.", "Estado", ""]
        )
        hh = self.progress_table.horizontalHeader()
        hh.setSectionResizeMode(0, QHeaderView.ResizeMode.ResizeToContents)
        hh.setSectionResizeMode(1, QHeaderView.ResizeMode.Stretch)
        hh.setSectionResizeMode(2, QHeaderView.ResizeMode.Fixed)
        hh.setSectionResizeMode(3, QHeaderView.ResizeMode.ResizeToContents)
        hh.setSectionResizeMode(4, QHeaderView.ResizeMode.ResizeToContents)
        hh.setSectionResizeMode(5, QHeaderView.ResizeMode.Fixed)
        self.progress_table.setColumnWidth(2, 160)
        self.progress_table.setColumnWidth(5, 40)
        self.progress_table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        self.progress_table.setSelectionMode(QTableWidget.SelectionMode.NoSelection)
        pf_layout.addWidget(self.progress_table)

        layout.addWidget(splitter, stretch=2)
        layout.addWidget(progress_frame, stretch=1)

        self.statusBar().showMessage("Iniciando...")

    def _bold_label(self, text: str) -> QLabel:
        lbl = QLabel(text)
        font = lbl.font()
        font.setBold(True)
        lbl.setFont(font)
        return lbl

    def _status(self, msg: str):
        self.statusBar().showMessage(msg)

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
        if hasattr(self, '_scanner') and self._scanner.isRunning():
            return
        self.btn_scan.setEnabled(False)
        self.btn_scan.setText("🔍 Buscando...")
        self._status("Buscando consolas en la red local...")
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
        self.btn_scan.setText("🔍 Buscar")
        count = self.console_list.count()
        if count == 0:
            self._status("No se encontraron consolas. Verificá que estén encendidas y en la misma red.")
        else:
            self._status(f"{count} consola(s) detectada(s). Hacé clic para seleccionar.")

    # ------------------------------------------------------------------
    # Consola seleccionada
    # ------------------------------------------------------------------

    def _on_console_clicked(self, item: QListWidgetItem):
        console_id = item.data(Qt.ItemDataRole.UserRole)
        self.selected_console = self.consoles.get(console_id)
        if self.selected_console:
            self._populate_catalog(self.selected_console)
            self._refresh_staging_panel()
            self.btn_rename.setEnabled(True)

    def _populate_catalog(self, console: ConsoleInfo):
        self._catalog_table.setRowCount(0)
        self.search_box.clear()
        self._catalog_hint.hide()

        games, error_msg = load_catalog(self.config["hdd_root"], console.console_type)

        if error_msg:
            self._catalog_hint.setText(f"ℹ️  {error_msg}")
            self._catalog_hint.show()
            self._status(f"Sin juegos para {console.label} — {error_msg.splitlines()[0]}")
            return

        staging_names = {g.name for g in self.staging_manager.get(console.console_id)}

        for game in games:
            row = self._catalog_table.rowCount()
            self._catalog_table.insertRow(row)

            name_item = QTableWidgetItem(game.name)
            name_item.setData(Qt.ItemDataRole.UserRole, game)
            self._catalog_table.setItem(row, 0, name_item)

            btn = QPushButton("→▸")
            btn.setFixedHeight(24)
            btn.setEnabled(game.name not in staging_names)
            btn.clicked.connect(lambda _, g=game: self._add_to_staging(g))
            self._catalog_table.setCellWidget(row, 1, btn)

        self._status(
            f"{len(games)} juego(s) para {console.label}. "
            "Usá → para agregar a la cola, luego ▶ INICIAR CARGA."
        )

    def _filter_catalog(self, text: str):
        for row in range(self._catalog_table.rowCount()):
            item = self._catalog_table.item(row, 0)
            hidden = text.lower() not in (item.text() if item else "").lower()
            self._catalog_table.setRowHidden(row, hidden)

    def _rename_console(self):
        if not self.selected_console:
            return
        new_name, ok = QInputDialog.getText(
            self, "Renombrar consola", "Nombre del cliente:",
            text=self.selected_console.label,
        )
        if not (ok and new_name.strip()):
            return

        old_id = self.selected_console.console_id
        new_label = new_name.strip()
        self.selected_console.label = new_label

        self.consoles[new_label] = self.consoles.pop(old_id)
        if old_id in self.workers:
            self.workers[new_label] = self.workers.pop(old_id)

        for i in range(self.console_list.count()):
            item = self.console_list.item(i)
            if item.data(Qt.ItemDataRole.UserRole) == old_id:
                item.setText(f"🟢 {new_label}")
                item.setData(Qt.ItemDataRole.UserRole, new_label)

        for row in range(self.progress_table.rowCount()):
            cell = self.progress_table.item(row, 0)
            if cell and cell.text() == old_id:
                cell.setText(new_label)
                break

        self._staging_title.setText(f"COLA: {new_label}")

    # ------------------------------------------------------------------
    # Staging
    # ------------------------------------------------------------------

    def _add_to_staging(self, game: GameEntry):
        if not self.selected_console:
            return
        self.staging_manager.add(self.selected_console.console_id, game)
        self._refresh_staging_panel()
        self._update_catalog_buttons()

    def _remove_from_staging(self, index: int):
        if not self.selected_console:
            return
        self.staging_manager.remove(self.selected_console.console_id, index)
        self._refresh_staging_panel()
        self._update_catalog_buttons()

    def _refresh_staging_panel(self):
        console = self.selected_console
        if not console:
            return

        self._staging_title.setText(f"COLA: {console.label}")
        self._staging_list.clear()

        games = self.staging_manager.get(console.console_id)
        for i, game in enumerate(games):
            item = QListWidgetItem()

            row_widget = QWidget()
            row_layout = QHBoxLayout(row_widget)
            row_layout.setContentsMargins(4, 1, 4, 1)

            lbl = QLabel(game.name)
            btn_remove = QPushButton("✕")
            btn_remove.setFixedWidth(28)
            btn_remove.setFixedHeight(22)
            btn_remove.clicked.connect(lambda _, idx=i: self._remove_from_staging(idx))

            row_layout.addWidget(lbl, stretch=1)
            row_layout.addWidget(btn_remove)

            item.setSizeHint(row_widget.sizeHint())
            self._staging_list.addItem(item)
            self._staging_list.setItemWidget(item, row_widget)

        total_gb = self.staging_manager.total_size_gb(console.console_id)
        self._staging_info.setText(f"{len(games)} juego(s) · ~{total_gb:.1f} GB")
        self.btn_start_transfer.setEnabled(len(games) > 0)

    def _update_catalog_buttons(self):
        if not self.selected_console:
            return
        staging_names = {g.name for g in self.staging_manager.get(self.selected_console.console_id)}
        for row in range(self._catalog_table.rowCount()):
            item = self._catalog_table.item(row, 0)
            btn = self._catalog_table.cellWidget(row, 1)
            if item and btn:
                btn.setEnabled(item.text() not in staging_names)

    # ------------------------------------------------------------------
    # Transferencia
    # ------------------------------------------------------------------

    def _commit_and_transfer(self):
        console = self.selected_console
        if not console:
            return

        remote_base = (
            self.config.get("ps3_remote_path", "/dev_hdd0/GAMES/")
            if console.console_type == ConsoleType.PS3
            else self.config.get("xbox_remote_path", "Hdd1:\\Games\\")
        )
        if not remote_base:
            QMessageBox.warning(
                self, "Ruta no configurada",
                f"La ruta remota para {console.console_type.value} está vacía.\n"
                "Configurala en Archivo → Configuración."
            )
            return

        jobs = self.staging_manager.commit(console.console_id, remote_base)
        if not jobs:
            return

        self._job_totals[console.console_id] = len(jobs)
        self._job_done_count[console.console_id] = 0
        for job in jobs:
            self._job_registry[(console.console_id, job.game.name)] = job

        self.queue_manager.add_jobs(console.console_id, jobs)
        self._ensure_worker_running(console)
        self._refresh_staging_panel()
        self._status(f"Iniciando carga de {len(jobs)} juego(s) en {console.label}...")

    def _ensure_worker_running(self, console: ConsoleInfo):
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

        self._upsert_progress_row(console)
        worker.start()

    def _cancel_transfer(self, console_id: str):
        worker = self.workers.get(console_id)
        if worker and worker.isRunning():
            worker.stop()
        self.queue_manager.clear(console_id)
        row = self._find_row(console_id)
        item_st = self._safe_item(row, 4)
        if item_st:
            item_st.setText("⛔ Cancelado")
        self.progress_table.removeCellWidget(row, 5)

    def _retry_job(self, console_id: str, job: TransferJob):
        console = self.consoles.get(console_id)
        if not console:
            return
        self.queue_manager.add_jobs(console_id, [job])
        self._ensure_worker_running(console)

        row = self._find_row(console_id)
        item_name = self._safe_item(row, 1)
        if item_name:
            item_name.setText("Reintentando...")

        btn_cancel = QPushButton("⏹")
        btn_cancel.setFixedWidth(36)
        btn_cancel.clicked.connect(lambda _, cid=console_id: self._cancel_transfer(cid))
        self.progress_table.setCellWidget(row, 5, btn_cancel)

    # ------------------------------------------------------------------
    # Progreso
    # ------------------------------------------------------------------

    def _upsert_progress_row(self, console: ConsoleInfo):
        for row in range(self.progress_table.rowCount()):
            cell = self.progress_table.item(row, 0)
            if cell and cell.text() == console.label:
                item_name = self._safe_item(row, 1)
                if item_name:
                    item_name.setText("Iniciando...")
                bar = self._safe_widget(row, 2)
                if bar:
                    bar.setValue(0)
                item_vel = self._safe_item(row, 3)
                if item_vel:
                    item_vel.setText("—")
                item_st = self._safe_item(row, 4)
                if item_st:
                    item_st.setText("En cola")
                btn_cancel = QPushButton("⏹")
                btn_cancel.setFixedWidth(36)
                btn_cancel.clicked.connect(lambda _, cid=console.console_id: self._cancel_transfer(cid))
                self.progress_table.setCellWidget(row, 5, btn_cancel)
                return

        row = self.progress_table.rowCount()
        self.progress_table.insertRow(row)
        self.progress_table.setItem(row, 0, QTableWidgetItem(console.label))
        self.progress_table.setItem(row, 1, QTableWidgetItem("Iniciando..."))
        bar = QProgressBar()
        bar.setRange(0, 100)
        bar.setValue(0)
        self.progress_table.setCellWidget(row, 2, bar)
        self.progress_table.setItem(row, 3, QTableWidgetItem("—"))
        self.progress_table.setItem(row, 4, QTableWidgetItem("En cola"))

        btn_cancel = QPushButton("⏹")
        btn_cancel.setFixedWidth(36)
        btn_cancel.clicked.connect(lambda _, cid=console.console_id: self._cancel_transfer(cid))
        self.progress_table.setCellWidget(row, 5, btn_cancel)

    def _find_row(self, console_id: str) -> int:
        console = self.consoles.get(console_id)
        if not console:
            return -1
        for row in range(self.progress_table.rowCount()):
            cell = self.progress_table.item(row, 0)
            if cell and cell.text() == console.label:
                return row
        return -1

    def _safe_item(self, row: int, col: int):
        if row < 0 or row >= self.progress_table.rowCount():
            return None
        return self.progress_table.item(row, col)

    def _safe_widget(self, row: int, col: int):
        if row < 0 or row >= self.progress_table.rowCount():
            return None
        return self.progress_table.cellWidget(row, col)

    @pyqtSlot(str, str, int, int, float)
    def _on_progress(self, console_id: str, game_name: str, bytes_sent: int, total_bytes: int, mbps: float):
        row = self._find_row(console_id)
        item_name = self._safe_item(row, 1)
        if item_name:
            item_name.setText(game_name)
        if total_bytes > 0:
            bar = self._safe_widget(row, 2)
            if bar:
                bar.setValue(int(bytes_sent * 100 / total_bytes))
        item_vel = self._safe_item(row, 3)
        if item_vel:
            item_vel.setText(f"{mbps:.1f} MB/s")
        self._latest_eta_data[console_id] = (max(0, total_bytes - bytes_sent), mbps)

    @pyqtSlot(str, str, int)
    def _on_retry_attempt(self, console_id: str, game_name: str, attempt: int):
        row = self._find_row(console_id)
        item_name = self._safe_item(row, 1)
        if item_name:
            item_name.setText(f"{game_name} (Reintentando {attempt}/{MAX_RETRIES}...)")
        item_st = self._safe_item(row, 4)
        if item_st:
            item_st.setText(f"Reintento {attempt}/{MAX_RETRIES}")

    @pyqtSlot(str, str, str)
    def _on_job_done(self, console_id: str, game_name: str, note: str):
        row = self._find_row(console_id)
        self._job_done_count[console_id] = self._job_done_count.get(console_id, 0) + 1
        n = self._job_done_count[console_id]
        total = self._job_totals.get(console_id, 0)

        item_name = self._safe_item(row, 1)
        item_st = self._safe_item(row, 4)

        if note == "skipped":
            if item_st:
                item_st.setText(f"↷ J.{n}/{total} (ya existe)")
        else:
            if item_name:
                item_name.setText(f"✓ {game_name}")
            if item_st:
                item_st.setText(f"J.{n}/{total}")

    @pyqtSlot(str, str, str)
    def _on_job_failed(self, console_id: str, game_name: str, error_msg: str):
        row = self._find_row(console_id)
        self._job_done_count[console_id] = self._job_done_count.get(console_id, 0) + 1

        item_name = self._safe_item(row, 1)
        item_st = self._safe_item(row, 4)

        if item_name:
            item_name.setText(f"❌ {game_name}")
        if item_st:
            item_st.setText(f"❌ Error: {error_msg[:45]}")

        self._status(f"⚠️  {game_name}: {error_msg[:80]}")

        job = self._job_registry.get((console_id, game_name))
        if job:
            btn_retry = QPushButton("🔄")
            btn_retry.setFixedWidth(36)
            btn_retry.clicked.connect(lambda _, cid=console_id, j=job: self._retry_job(cid, j))
            self.progress_table.setCellWidget(row, 5, btn_retry)

    @pyqtSlot(str, int, int)
    def _on_queue_done(self, console_id: str, success_count: int, fail_count: int):
        row = self._find_row(console_id)
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
            status = f"✅ {success_count} cargado(s)"
            if fail_count:
                status += f"  ❌ {fail_count} error(es)"
            item_st.setText(status)

        self.progress_table.removeCellWidget(row, 5)
        self._latest_eta_data.pop(console_id, None)

        console = self.consoles.get(console_id)
        if console:
            msg = f"{console.label}: ¡Carga completa! {success_count} juego(s)"
            if fail_count:
                msg += f", {fail_count} con error"
            self.tray.notify("GameLoader", msg)
            self._status(msg)

    def _update_eta_status(self):
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
        self._status(f"{n} consola(s) transfiriendo — ETA estimado: {eta_str}")
