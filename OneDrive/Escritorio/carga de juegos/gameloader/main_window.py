from typing import Dict, List, Optional

from PyQt6.QtCore import Qt, QTimer, pyqtSlot
from PyQt6.QtGui import QFont
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
