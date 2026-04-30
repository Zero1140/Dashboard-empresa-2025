import socket
from typing import Dict, Optional, Tuple

from PyQt6.QtCore import Qt, QThread, QTimer, pyqtSlot
from PyQt6.QtGui import QAction, QColor
from PyQt6.QtWidgets import (
    QApplication, QFrame, QHeaderView, QInputDialog, QLabel,
    QLineEdit, QListWidget, QListWidgetItem, QMainWindow,
    QMessageBox, QProgressBar, QPushButton, QSplitter,
    QTableWidget, QTableWidgetItem, QVBoxLayout, QHBoxLayout, QWidget,
    QMenuBar, QToolBar,
)

from catalog import load_catalog, CatalogSizeWorker
from hen_guide_dialog import HenGuideDialog
from pkg_guide_dialog import PkgGuideDialog
from config import save_config
from format_detector import detect_format, remote_path_for_format
from ftp_worker import FTPWorker, FreeSpaceWorker, MAX_RETRIES
from models import ConsoleInfo, ConsoleType, GameEntry, TransferJob
from queue_manager import QueueManager
from scanner import ScannerThread, ConsoleHealthChecker
from settings_dialog import SettingsDialog
from staging_manager import StagingManager
from tray import SystemTray, set_autostart
from webman import WebManClient, WebManPostWorker


_FORMAT_BADGE = {
    "folder": "CARPETA",
    "iso": "ISO",
    "iso_set": "MULTI-ISO",
    "pkg": "PKG",
}


class ManualConnectWorker(QThread):
    found = pyqtSignal(object)     # ConsoleInfo
    not_found = pyqtSignal(str)    # ip that failed

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
        self._progress_rows: Dict[str, int] = {}  # console_id → row index
        self._webman_post_workers: Dict[str, QThread] = {}

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

    # ------------------------------------------------------------------
    # Menu + toolbar
    # ------------------------------------------------------------------

    def _setup_menu(self):
        mb = QMenuBar(self)
        self.setMenuBar(mb)
        menu = mb.addMenu("&Archivo")

        act_settings = QAction("Configuracion...", self)
        act_settings.setShortcut("Ctrl+,")
        act_settings.triggered.connect(self._open_settings)
        menu.addAction(act_settings)

        menu.addSeparator()

        act_quit = QAction("Salir", self)
        act_quit.triggered.connect(QApplication.instance().quit)
        menu.addAction(act_quit)

    def _setup_toolbar(self):
        tb = QToolBar("Principal", self)
        tb.setMovable(False)
        tb.setFloatable(False)
        tb.setToolButtonStyle(Qt.ToolButtonStyle.ToolButtonTextBesideIcon)

        act_cfg = QAction("  Configurar carpetas de juegos", self)
        act_cfg.setToolTip("Seleccionar donde estan los juegos PS3 y Xbox en tu disco")
        act_cfg.triggered.connect(self._open_settings)
        tb.addAction(act_cfg)

        tb.addSeparator()

        self._act_scan = QAction("  Buscar consolas", self)
        self._act_scan.setToolTip("Escanear la red local para detectar consolas PS3 / Xbox")
        self._act_scan.triggered.connect(self._start_scan)
        tb.addAction(self._act_scan)

        self.addToolBar(tb)

    def _open_settings(self):
        dlg = SettingsDialog(self.config, self)
        if dlg.exec() != SettingsDialog.DialogCode.Accepted:
            return
        new_cfg = dlg.get_config()

        autostart_changed = new_cfg["autostart_windows"] != self.config.get("autostart_windows", False)
        interval_changed = new_cfg["scan_interval_seconds"] != self.config.get("scan_interval_seconds", 30)
        subnet_changed = new_cfg.get("scan_subnet", "") != self.config.get("scan_subnet", "")
        root_changed = (
            new_cfg.get("ps3_root", "") != self.config.get("ps3_root", "") or
            new_cfg.get("xbox_root", "") != self.config.get("xbox_root", "")
        )

        self.config = new_cfg
        if not save_config(self.config):
            self._status("No se pudo guardar la configuracion (disco lleno o sin permisos)")

        if autostart_changed:
            ok = set_autostart(new_cfg["autostart_windows"])
            if not ok and new_cfg["autostart_windows"]:
                QMessageBox.warning(
                    self, "Inicio automatico",
                    "No se pudo configurar el inicio automatico con Windows.\n"
                    "Intenta ejecutar GameLoader como administrador."
                )

        if interval_changed:
            self._scan_timer.setInterval(new_cfg["scan_interval_seconds"] * 1000)

        if subnet_changed:
            self._start_scan()

        if root_changed:
            if self.selected_console:
                self._populate_catalog(self.selected_console)
            else:
                self._show_welcome()

    # ------------------------------------------------------------------
    # UI setup
    # ------------------------------------------------------------------

    def _setup_ui(self):
        self.setWindowTitle("GameLoader")
        self.setMinimumSize(1050, 640)
        self.resize(1200, 750)
        self._setup_menu()
        self._setup_toolbar()

        central = QWidget()
        self.setCentralWidget(central)
        main_layout = QVBoxLayout(central)
        main_layout.setContentsMargins(10, 8, 10, 8)
        main_layout.setSpacing(8)

        splitter = QSplitter(Qt.Orientation.Horizontal)

        # ── Left: consolas ──────────────────────────────────────────────
        left = QWidget()
        left.setMinimumWidth(180)
        left_layout = QVBoxLayout(left)
        left_layout.setContentsMargins(0, 0, 0, 0)
        left_layout.setSpacing(6)
        left_layout.addWidget(self._section_label("CONSOLAS"))

        self.console_list = QListWidget()
        self.console_list.setAlternatingRowColors(True)
        self.console_list.itemClicked.connect(self._on_console_clicked)
        left_layout.addWidget(self.console_list, stretch=1)

        self._lbl_no_consoles = QLabel(
            "Sin consolas.\nVerifica que esten\nencendidas y en\nla misma red."
        )
        self._lbl_no_consoles.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._lbl_no_consoles.setStyleSheet("color: #404070; font-style: italic; padding: 8px;")
        self._lbl_no_consoles.setWordWrap(True)
        left_layout.addWidget(self._lbl_no_consoles)

        self._lbl_free_space = QLabel("")
        self._lbl_free_space.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._lbl_free_space.setStyleSheet("color: #404070; font-size: 11px; padding: 2px 4px;")
        self._lbl_free_space.hide()
        left_layout.addWidget(self._lbl_free_space)

        btn_row = QHBoxLayout()
        btn_row.setSpacing(4)

        self.btn_scan = QPushButton("Buscar")
        self.btn_scan.setToolTip("Escanear la red para detectar consolas")
        self.btn_scan.clicked.connect(self._start_scan)
        btn_row.addWidget(self.btn_scan)

        self.btn_rename = QPushButton("Renombrar")
        self.btn_rename.setEnabled(False)
        self.btn_rename.setToolTip("Asignar un nombre al cliente de esta consola")
        self.btn_rename.clicked.connect(self._rename_console)
        btn_row.addWidget(self.btn_rename)

        self.btn_add_ip = QPushButton("IP...")
        self.btn_add_ip.setToolTip("Agregar una consola ingresando su IP directamente")
        self.btn_add_ip.clicked.connect(self._add_console_by_ip)
        btn_row.addWidget(self.btn_add_ip)

        left_layout.addLayout(btn_row)

        # ── Center: catalogo ────────────────────────────────────────────
        center = QWidget()
        center.setMinimumWidth(320)
        center_layout = QVBoxLayout(center)
        center_layout.setContentsMargins(0, 0, 0, 0)
        center_layout.setSpacing(6)

        catalog_header = QHBoxLayout()
        catalog_header.addWidget(self._section_label("CATALOGO"))
        catalog_header.addStretch()
        self._lbl_catalog_count = QLabel("")
        self._lbl_catalog_count.setStyleSheet("color: #505090; font-size: 12px;")
        catalog_header.addWidget(self._lbl_catalog_count)
        center_layout.addLayout(catalog_header)

        self.search_box = QLineEdit()
        self.search_box.setPlaceholderText("Buscar juego...")
        self.search_box.textChanged.connect(self._filter_catalog)
        center_layout.addWidget(self.search_box)

        self._catalog_table = QTableWidget(0, 3)
        self._catalog_table.horizontalHeader().hide()
        self._catalog_table.verticalHeader().hide()
        self._catalog_table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        self._catalog_table.setSelectionMode(QTableWidget.SelectionMode.NoSelection)
        self._catalog_table.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeMode.Stretch)
        self._catalog_table.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeMode.Fixed)
        self._catalog_table.horizontalHeader().setSectionResizeMode(2, QHeaderView.ResizeMode.Fixed)
        self._catalog_table.setColumnWidth(1, 80)
        self._catalog_table.setColumnWidth(2, 62)
        self._catalog_table.setShowGrid(False)
        self._catalog_table.setAlternatingRowColors(True)
        center_layout.addWidget(self._catalog_table, stretch=1)

        # Card mostrada cuando no hay carpeta configurada o no hay consola seleccionada
        self._no_catalog_card = self._make_no_catalog_card()
        center_layout.addWidget(self._no_catalog_card, stretch=1)

        # ── Right: staging ──────────────────────────────────────────────
        right = QWidget()
        right.setMinimumWidth(220)
        right_layout = QVBoxLayout(right)
        right_layout.setContentsMargins(0, 0, 0, 0)
        right_layout.setSpacing(6)
        self._staging_title = self._section_label("COLA: —")
        right_layout.addWidget(self._staging_title)

        self._staging_list = QListWidget()
        right_layout.addWidget(self._staging_list, stretch=1)

        self._staging_info = QLabel("0 juegos  ·  ~0.0 GB")
        self._staging_info.setStyleSheet("color: #505090; font-style: italic; padding: 4px;")
        right_layout.addWidget(self._staging_info)

        self.btn_start_transfer = QPushButton("INICIAR CARGA")
        self.btn_start_transfer.setObjectName("btn_start")
        self.btn_start_transfer.setEnabled(False)
        self.btn_start_transfer.clicked.connect(self._commit_and_transfer)
        right_layout.addWidget(self.btn_start_transfer)

        splitter.addWidget(left)
        splitter.addWidget(center)
        splitter.addWidget(right)
        splitter.setSizes([200, 520, 280])

        # ── Bottom: progreso ────────────────────────────────────────────
        progress_frame = QFrame()
        progress_frame.setFrameShape(QFrame.Shape.StyledPanel)
        pf_layout = QVBoxLayout(progress_frame)
        pf_layout.setContentsMargins(10, 8, 10, 8)
        pf_layout.setSpacing(4)
        pf_layout.addWidget(self._section_label("TRANSFERENCIAS ACTIVAS"))

        self.progress_table = QTableWidget(0, 6)
        self.progress_table.setHorizontalHeaderLabels(
            ["Consola", "Juego", "Progreso", "Vel.", "Estado", ""]
        )
        self.progress_table.setAlternatingRowColors(True)
        hh = self.progress_table.horizontalHeader()
        hh.setSectionResizeMode(0, QHeaderView.ResizeMode.ResizeToContents)
        hh.setSectionResizeMode(1, QHeaderView.ResizeMode.Stretch)
        hh.setSectionResizeMode(2, QHeaderView.ResizeMode.Fixed)
        hh.setSectionResizeMode(3, QHeaderView.ResizeMode.ResizeToContents)
        hh.setSectionResizeMode(4, QHeaderView.ResizeMode.ResizeToContents)
        hh.setSectionResizeMode(5, QHeaderView.ResizeMode.Fixed)
        self.progress_table.setColumnWidth(2, 160)
        self.progress_table.setColumnWidth(5, 42)
        self.progress_table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        self.progress_table.setSelectionMode(QTableWidget.SelectionMode.NoSelection)
        self.progress_table.verticalHeader().hide()
        pf_layout.addWidget(self.progress_table)

        main_layout.addWidget(splitter, stretch=2)
        main_layout.addWidget(progress_frame, stretch=1)

        self.statusBar().showMessage("Listo. Usa la barra superior para configurar las carpetas de juegos.")
        self._show_welcome()

    def _make_no_catalog_card(self) -> QWidget:
        card = QWidget()
        layout = QVBoxLayout(card)
        layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.setSpacing(16)

        self._no_catalog_icon = QLabel("?")
        self._no_catalog_icon.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._no_catalog_icon.setStyleSheet("font-size: 48px; color: #303060;")
        layout.addWidget(self._no_catalog_icon)

        self._no_catalog_msg = QLabel("Selecciona una consola\nde la lista de la izquierda")
        self._no_catalog_msg.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._no_catalog_msg.setWordWrap(True)
        self._no_catalog_msg.setStyleSheet(
            "color: #505090; font-size: 13px; font-style: italic; padding: 4px 20px;"
        )
        layout.addWidget(self._no_catalog_msg)

        self._btn_cfg_from_card = QPushButton("Configurar carpetas de juegos")
        self._btn_cfg_from_card.setObjectName("btn_cfg_big")
        self._btn_cfg_from_card.setToolTip("Abre la ventana para elegir donde estan los juegos PS3 y Xbox")
        self._btn_cfg_from_card.clicked.connect(self._open_settings)
        self._btn_cfg_from_card.hide()
        layout.addWidget(self._btn_cfg_from_card)

        return card

    def _show_welcome(self):
        ps3_ok = bool(self.config.get("ps3_root", ""))
        xbox_ok = bool(self.config.get("xbox_root", ""))

        self._catalog_table.hide()
        self.search_box.hide()
        self._no_catalog_card.show()
        self._lbl_catalog_count.setText("")

        if not ps3_ok and not xbox_ok:
            self._no_catalog_icon.setText("?")
            self._no_catalog_msg.setText(
                "No hay carpetas de juegos configuradas.\n\n"
                "Hace clic en el boton de abajo para indicarle\n"
                "a GameLoader donde estan tus juegos."
            )
            self._btn_cfg_from_card.show()
        else:
            self._no_catalog_icon.setText("")
            self._no_catalog_msg.setText(
                "Selecciona una consola de la lista\npara ver los juegos disponibles."
            )
            self._btn_cfg_from_card.hide()

    def _section_label(self, text: str) -> QLabel:
        lbl = QLabel(text)
        lbl.setStyleSheet(
            "color: #5858a8; font-size: 11px; font-weight: bold; "
            "letter-spacing: 1px; padding: 2px 0;"
        )
        return lbl

    def _setup_tray(self):
        self.tray = SystemTray(QApplication.instance(), self)
        self.tray.show_window.connect(self.show)
        self.tray.quit_app.connect(self._safe_quit)

    def _safe_quit(self):
        active = [w for w in self.workers.values() if w.isRunning()]
        if active:
            resp = QMessageBox.question(
                self, "Cerrar GameLoader",
                f"Hay {len(active)} transferencia(s) activa(s).\n\n"
                "Si cerras ahora los juegos en proceso quedan incompletos "
                "y tendran que cargarse de nuevo.\n\n"
                "Cerrar de todas formas?",
                QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
                QMessageBox.StandardButton.No,
            )
            if resp != QMessageBox.StandardButton.Yes:
                return
        for worker in self.workers.values():
            worker.stop()
        for worker in self.workers.values():
            worker.wait(2000)
        QApplication.instance().quit()

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
        self.btn_scan.setText("Buscando...")
        if hasattr(self, '_act_scan'):
            self._act_scan.setEnabled(False)
        self._status("Buscando consolas en la red local...")
        self._scanner = ScannerThread(self, subnet=self.config.get("scan_subnet", ""))
        self._scanner.console_found.connect(self._on_console_found)
        self._scanner.scan_finished.connect(self._on_scan_finished)
        self._scanner.start()

    @pyqtSlot(object)
    def _on_console_found(self, console: ConsoleInfo):
        if console.console_id not in self.consoles:
            self.consoles[console.console_id] = console
            item = QListWidgetItem(f"  {self._console_label(console)}")
            item.setData(Qt.ItemDataRole.UserRole, console.console_id)
            self.console_list.addItem(item)
            self._lbl_no_consoles.hide()

    @pyqtSlot()
    def _on_scan_finished(self):
        self.btn_scan.setEnabled(True)
        self.btn_scan.setText("Buscar")
        if hasattr(self, '_act_scan'):
            self._act_scan.setEnabled(True)
        count = self.console_list.count()
        if count == 0:
            self._lbl_no_consoles.show()
            self._status("Sin consolas detectadas. Verifica que esten encendidas y en la misma red.")
        else:
            self._lbl_no_consoles.hide()
            self._status(f"{count} consola(s) detectada(s). Hace clic en una para ver los juegos.")

    def _start_health_check(self):
        if not self.consoles:
            return
        if hasattr(self, '_health_checker') and self._health_checker.isRunning():
            return
        self._health_checker = ConsoleHealthChecker(self.consoles, self)
        self._health_checker.console_online.connect(self._on_console_online)
        self._health_checker.console_offline.connect(self._on_console_offline)
        self._health_checker.start()

    @pyqtSlot(str)
    def _on_console_online(self, console_id: str):
        self._console_online[console_id] = True
        self._update_console_item_state(console_id, online=True)

    @pyqtSlot(str)
    def _on_console_offline(self, console_id: str):
        self._console_online[console_id] = False
        self._update_console_item_state(console_id, online=False)

    def _update_console_item_state(self, console_id: str, online: bool):
        console = self.consoles.get(console_id)
        if not console:
            return
        for i in range(self.console_list.count()):
            item = self.console_list.item(i)
            if item.data(Qt.ItemDataRole.UserRole) == console_id:
                if online:
                    item.setText(f"  {self._console_label(console)}")
                    item.setForeground(QColor("#c0c0e0"))
                else:
                    item.setText(f"  {self._console_label(console)}  [sin conexion]")
                    item.setForeground(QColor("#804040"))
                break

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
            self._query_free_space(self.selected_console)

    def _query_free_space(self, console: ConsoleInfo):
        self._lbl_free_space.setText("Espacio libre: consultando...")
        self._lbl_free_space.setStyleSheet(
            "color: #404060; font-size: 11px; padding: 2px 4px; font-style: italic;"
        )
        self._lbl_free_space.show()
        worker = FreeSpaceWorker(console)
        worker.result.connect(self._on_free_space_result)
        worker.start()
        self._free_space_worker = worker

    @pyqtSlot(str, float)
    def _on_free_space_result(self, console_id: str, free_gb: float):
        if free_gb >= 0:
            self._free_space_cache[console_id] = free_gb
        if not self.selected_console or self.selected_console.console_id != console_id:
            return
        if free_gb >= 0:
            if free_gb > 10:
                color = "#28b060"
            elif free_gb > 2:
                color = "#d09020"
            else:
                color = "#d04040"
            self._lbl_free_space.setText(f"Espacio libre: {free_gb:.1f} GB")
            self._lbl_free_space.setStyleSheet(
                f"color: {color}; font-size: 11px; font-weight: bold; padding: 2px 4px;"
            )
        else:
            self._lbl_free_space.setText("Espacio libre: no disponible")
            self._lbl_free_space.setStyleSheet(
                "color: #404060; font-size: 11px; padding: 2px 4px;"
            )

    def _populate_catalog(self, console: ConsoleInfo):
        self.search_box.clear()
        self._no_catalog_card.hide()
        self._catalog_table.setRowCount(0)

        root_key = "ps3_root" if console.console_type == ConsoleType.PS3 else "xbox_root"
        games, error_msg = load_catalog(self.config.get(root_key, ""), console.console_type)

        if error_msg:
            self._catalog_table.hide()
            self.search_box.hide()
            self._no_catalog_card.show()

            not_configured = not self.config.get(root_key, "")
            self._no_catalog_icon.setText("!" if not not_configured else "?")
            self._no_catalog_msg.setText(error_msg)
            if not_configured:
                self._btn_cfg_from_card.show()
            else:
                self._btn_cfg_from_card.hide()

            self._lbl_catalog_count.setText("")
            self._status(f"Sin juegos para {console.label} — {error_msg.splitlines()[0]}")
            return

        self._catalog_table.show()
        self.search_box.show()
        self._game_size_cache.clear()

        staging_names = {g.name for g in self.staging_manager.get(console.console_id)}

        for game in games:
            row = self._catalog_table.rowCount()
            self._catalog_table.insertRow(row)
            self._catalog_table.setRowHeight(row, 28)

            badge = _FORMAT_BADGE.get(game.format.value, "")
            display_name = f"[{badge}]  {game.name}" if badge else game.name
            name_item = QTableWidgetItem(display_name)
            name_item.setData(Qt.ItemDataRole.UserRole, game)
            self._catalog_table.setItem(row, 0, name_item)

            size_item = QTableWidgetItem("...")
            size_item.setTextAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
            size_item.setForeground(QColor("#505080"))
            self._catalog_table.setItem(row, 1, size_item)

            btn = QPushButton("Agregar")
            btn.setFixedHeight(22)
            btn.setEnabled(game.name not in staging_names)
            btn.clicked.connect(lambda _, g=game: self._add_to_staging(g))
            self._catalog_table.setCellWidget(row, 2, btn)

        self._lbl_catalog_count.setText(f"{len(games)} juegos")
        self._status(
            f"{len(games)} juego(s) disponibles para {console.label}. "
            "Hace clic en 'Agregar' y luego en 'INICIAR CARGA'."
        )

        self._size_worker = CatalogSizeWorker(games, self)
        self._size_worker.size_ready.connect(self._on_game_size)
        self._size_worker.start()

    def _filter_catalog(self, text: str):
        for row in range(self._catalog_table.rowCount()):
            item = self._catalog_table.item(row, 0)
            entry = item.data(Qt.ItemDataRole.UserRole) if item else None
            name = entry.name if entry else (item.text() if item else "")
            self._catalog_table.setRowHidden(row, text.lower() not in name.lower())

    @pyqtSlot(str, int)
    def _on_game_size(self, game_name: str, byte_count: int):
        self._game_size_cache[game_name] = byte_count
        for row in range(self._catalog_table.rowCount()):
            name_item = self._catalog_table.item(row, 0)
            stored = name_item.data(Qt.ItemDataRole.UserRole) if name_item else None
            if stored and stored.name == game_name:
                size_item = self._catalog_table.item(row, 1)
                if size_item:
                    size_item.setText(self._format_size(byte_count))
                    size_item.setForeground(QColor("#7070a0"))
                break

    @staticmethod
    def _format_size(byte_count: int) -> str:
        if byte_count <= 0:
            return "—"
        gb = byte_count / (1024 ** 3)
        if gb >= 1.0:
            return f"{gb:.1f} GB"
        mb = byte_count / (1024 ** 2)
        return f"{mb:.0f} MB"

    def _console_label(self, console: ConsoleInfo) -> str:
        if console.console_type == ConsoleType.PS3:
            hen_badge = "  ✓ HEN" if console.hen_verified else "  ✗ HEN"
            wm_badge = "  [WM]" if console.webman else ""
        else:
            hen_badge = ""
            wm_badge = ""
        return f"{console.label}{hen_badge}{wm_badge}"

    def _rename_console(self):
        if not self.selected_console:
            return
        new_name, ok = QInputDialog.getText(
            self, "Renombrar consola", "Nombre del cliente:",
            text=self.selected_console.label,
        )
        if not (ok and new_name.strip()):
            return

        old_label = self.selected_console.label
        new_label = new_name.strip()
        self.selected_console.label = new_label

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

    def _add_console_by_ip(self):
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
        if ip in self.consoles:
            self._status(f"{ip} ya está en la lista de consolas.")
            return
        self.btn_add_ip.setEnabled(False)
        self.btn_add_ip.setText("Conectando...")
        self._status(f"Intentando conectar a {ip}...")
        worker = ManualConnectWorker(ip)
        worker.found.connect(self._on_manual_found)
        worker.not_found.connect(self._on_manual_not_found)
        worker.finished.connect(lambda: (
            self.btn_add_ip.setEnabled(True),
            self.btn_add_ip.setText("IP..."),
        ))
        worker.start()
        self._manual_worker = worker

    @pyqtSlot(object)
    def _on_manual_found(self, console: ConsoleInfo):
        if console.console_id in self.consoles:
            self._status(f"{console.label} ({console.ip}) ya estaba en la lista.")
            return
        self.consoles[console.console_id] = console
        item = QListWidgetItem(f"  {self._console_label(console)}")
        item.setData(Qt.ItemDataRole.UserRole, console.console_id)
        self.console_list.addItem(item)
        self._lbl_no_consoles.hide()
        self._status(f"Consola detectada: {console.label} ({console.ip})")

    @pyqtSlot(str)
    def _on_manual_not_found(self, ip: str):
        QMessageBox.warning(
            self, "Sin respuesta",
            f"No se detectó ninguna consola en {ip}.\n\n"
            "Verificá que:\n"
            "  • La consola esté encendida\n"
            "  • MultiMAN / webMAN esté activo y con FTP\n"
            "  • La IP sea correcta (verificala en MultiMAN)\n"
            "  • La consola y esta PC estén en la misma red"
        )
        self._status(f"Sin respuesta de {ip}")

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
            row_layout.setContentsMargins(8, 2, 4, 2)

            lbl = QLabel(game.name)
            lbl.setStyleSheet("color: #c0c0e0;")

            btn_remove = QPushButton("x")
            btn_remove.setFixedWidth(26)
            btn_remove.setFixedHeight(20)
            btn_remove.setStyleSheet(
                "QPushButton { background: #3a1a1a; color: #e05050; border: 1px solid #5a2020;"
                " border-radius: 3px; font-weight: bold; padding: 0; }"
                "QPushButton:hover { background: #5a2020; color: #ff7070; }"
            )
            btn_remove.clicked.connect(lambda _, idx=i: self._remove_from_staging(idx))

            row_layout.addWidget(lbl, stretch=1)
            row_layout.addWidget(btn_remove)

            item.setSizeHint(row_widget.sizeHint())
            self._staging_list.addItem(item)
            self._staging_list.setItemWidget(item, row_widget)

        total_gb = self.staging_manager.total_size_gb(console.console_id)
        n = len(games)
        if total_gb > 0:
            self._staging_info.setText(f"{n} juego(s)  ·  ~{total_gb:.1f} GB")
        else:
            self._staging_info.setText(f"{n} juego(s)")
        self.btn_start_transfer.setEnabled(n > 0)

    def _update_catalog_buttons(self):
        if not self.selected_console:
            return
        staging_names = {g.name for g in self.staging_manager.get(self.selected_console.console_id)}
        for row in range(self._catalog_table.rowCount()):
            item = self._catalog_table.item(row, 0)
            btn = self._catalog_table.cellWidget(row, 2)
            if item and btn:
                btn.setEnabled(item.text() not in staging_names)

    # ------------------------------------------------------------------
    # Transferencia
    # ------------------------------------------------------------------

    def _commit_and_transfer(self):
        console = self.selected_console
        if not console:
            return

        if not self._preflight_ok(console):
            QMessageBox.warning(
                self, "Consola no accesible",
                f"No se pudo conectar a {console.label} ({console.ip}) en el puerto FTP.\n\n"
                "Verifica que la consola este encendida, con el servidor FTP activo "
                "y en la misma red."
            )
            return

        if not self._hen_ok(console):
            dlg = HenGuideDialog(console.ip, console.webman, self)
            dlg.exec()
            if not self._hen_ok(console):
                self._status("Transferencia cancelada: HEN no está activo.")
                return

        staged_games = self.staging_manager.get(console.console_id)
        if not staged_games:
            return

        jobs: list[TransferJob] = []
        for game in staged_games:
            local_path = game.local_path
            if console.console_type == ConsoleType.PS3:
                try:
                    fmt = detect_format(local_path)
                    game.format = fmt
                    remote_base = remote_path_for_format(fmt, self.config)
                except (FileNotFoundError, ValueError) as e:
                    remote_base = self.config.get("ps3_remote_path", "/dev_hdd0/GAMES/")
                    self._status(f"Advertencia: no se pudo detectar formato de '{game.name}' — usando GAMES/ ({e})")
            else:
                remote_base = self.config.get("xbox_remote_path", "Hdd1:\\Games\\")
            if not remote_base:
                QMessageBox.warning(
                    self, "Ruta no configurada",
                    f"La ruta remota para {console.console_type.value} esta vacia.\n"
                    "Configurala en Archivo → Configuracion."
                )
                return
            jobs.append(TransferJob(game=game, remote_base_path=remote_base))

        from format_detector import GameFormat
        self._batch_has_pkg[console.console_id] = [
            job.game.name for job in jobs if job.game.format == GameFormat.PKG
        ]

        total_bytes = sum(
            self._game_size_cache.get(job.game.name, 0)
            for job in jobs
        )
        if total_bytes > 0:
            free_gb = self._free_space_cache.get(console.console_id, -1.0)
            total_gb = total_bytes / (1024 ** 3)
            if free_gb >= 0 and total_gb > free_gb * 0.95:
                resp = QMessageBox.warning(
                    self, "Espacio insuficiente",
                    f"Los juegos seleccionados ocupan ~{total_gb:.1f} GB,\n"
                    f"pero la consola solo tiene {free_gb:.1f} GB libres.\n\n"
                    "Si continuás, algunos juegos pueden quedar incompletos.\n\n"
                    "¿Continuar de todas formas?",
                    QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
                    QMessageBox.StandardButton.No,
                )
                if resp != QMessageBox.StandardButton.Yes:
                    return

        self.staging_manager.clear(console.console_id)
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
        if row < 0:
            return
        item_st = self._safe_item(row, 4)
        if item_st:
            item_st.setText("Cancelado")
        self.progress_table.removeCellWidget(row, 5)

    def _retry_job(self, console_id: str, job: TransferJob):
        console = self.consoles.get(console_id)
        if not console:
            return
        self._job_done_count[console_id] = max(
            0, self._job_done_count.get(console_id, 0) - 1
        )
        self.queue_manager.add_jobs(console_id, [job])
        self._ensure_worker_running(console)

        row = self._find_row(console_id)
        item_name = self._safe_item(row, 1)
        if item_name:
            item_name.setText("Reintentando...")
        bar = self._safe_widget(row, 2)
        if bar:
            bar.setValue(0)

        btn_cancel = QPushButton("Detener")
        btn_cancel.setFixedWidth(60)
        btn_cancel.clicked.connect(lambda _, cid=console_id: self._cancel_transfer(cid))
        self.progress_table.setCellWidget(row, 5, btn_cancel)

    # ------------------------------------------------------------------
    # Progreso
    # ------------------------------------------------------------------

    def _upsert_progress_row(self, console: ConsoleInfo):
        existing = self._progress_rows.get(console.console_id, -1)
        if existing >= 0:
            row = existing
            self._safe_item(row, 1) and self._safe_item(row, 1).setText("Iniciando...")
            bar = self._safe_widget(row, 2)
            if bar:
                bar.setValue(0)
            self._safe_item(row, 3) and self._safe_item(row, 3).setText("—")
            self._safe_item(row, 4) and self._safe_item(row, 4).setText("En cola")
            btn = QPushButton("Detener")
            btn.setFixedWidth(60)
            btn.clicked.connect(lambda _, cid=console.console_id: self._cancel_transfer(cid))
            self.progress_table.setCellWidget(row, 5, btn)
            return

        row = self.progress_table.rowCount()
        self._progress_rows[console.console_id] = row
        self.progress_table.insertRow(row)
        self.progress_table.setRowHeight(row, 32)
        self.progress_table.setItem(row, 0, QTableWidgetItem(console.label))
        self.progress_table.setItem(row, 1, QTableWidgetItem("Iniciando..."))
        bar = QProgressBar()
        bar.setRange(0, 100)
        bar.setValue(0)
        self.progress_table.setCellWidget(row, 2, bar)
        self.progress_table.setItem(row, 3, QTableWidgetItem("—"))
        self.progress_table.setItem(row, 4, QTableWidgetItem("En cola"))

        btn = QPushButton("Detener")
        btn.setFixedWidth(60)
        btn.clicked.connect(lambda _, cid=console.console_id: self._cancel_transfer(cid))
        self.progress_table.setCellWidget(row, 5, btn)

    def _find_row(self, console_id: str) -> int:
        return self._progress_rows.get(console_id, -1)

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
            job = self._job_registry.get((console_id, game_name))
            if job:
                badge = _FORMAT_BADGE.get(job.game.format.value, "?")
                item_name.setText(f"{game_name}  [{badge}]")
            else:
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
            item_name.setText(f"{game_name}  (reintento {attempt}/{MAX_RETRIES})")
        item_st = self._safe_item(row, 4)
        if item_st:
            item_st.setText(f"Reintentando {attempt}/{MAX_RETRIES}")

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
                item_st.setText(f"J.{n}/{total}  (ya existe)")
        else:
            if item_name:
                item_name.setText(f"OK  {game_name}")
            if item_st:
                item_st.setText(f"J.{n}/{total}")

    @pyqtSlot(str, str, str)
    def _on_job_failed(self, console_id: str, game_name: str, error_msg: str):
        row = self._find_row(console_id)
        self._job_done_count[console_id] = self._job_done_count.get(console_id, 0) + 1

        item_name = self._safe_item(row, 1)
        item_st = self._safe_item(row, 4)

        if item_name:
            item_name.setText(f"Error: {game_name}")
        if item_st:
            item_st.setText(f"Error: {error_msg[:45]}")

        self._status(f"Error en {game_name}: {error_msg[:80]}")

        job = self._job_registry.get((console_id, game_name))
        if job:
            btn_retry = QPushButton("Reintentar")
            btn_retry.setFixedWidth(80)
            btn_retry.clicked.connect(lambda _, cid=console_id, j=job: self._retry_job(cid, j))
            self.progress_table.setCellWidget(row, 5, btn_retry)

    @pyqtSlot(str, int, int)
    def _on_queue_done(self, console_id: str, success_count: int, fail_count: int):
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
        self._latest_eta_data.pop(console_id, None)

        console = self.consoles.get(console_id)
        if console:
            msg = f"{console.label}: carga completa — {success_count} juego(s)"
            if fail_count:
                msg += f", {fail_count} con error"
            self.tray.notify("GameLoader", msg)
            self._status(msg)

        pkg_names = self._batch_has_pkg.pop(console_id, [])
        if pkg_names and success_count > 0:
            guide = PkgGuideDialog(pkg_names, self)
            guide.exec()

        if success_count > 0 and console and console.webman:
            worker = WebManPostWorker(console.ip, success_count)
            worker.finished.connect(
                lambda cid=console_id: self._webman_post_workers.pop(cid, None)
            )
            self._webman_post_workers[console_id] = worker
            worker.start()

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
        self._status(f"{n} consola(s) transfiriendo  —  ETA: {eta_str}")

    def _status(self, msg: str):
        self.statusBar().showMessage(msg)
