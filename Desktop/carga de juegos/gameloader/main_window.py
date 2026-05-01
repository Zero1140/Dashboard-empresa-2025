from __future__ import annotations
from typing import Dict, Optional, TYPE_CHECKING

from PyQt6.QtCore import Qt, pyqtSlot
from PyQt6.QtGui import QAction, QColor
from PyQt6.QtWidgets import (
    QApplication, QFrame, QHeaderView, QInputDialog, QLabel,
    QLineEdit, QListWidget, QListWidgetItem, QMainWindow,
    QMessageBox, QProgressBar, QPushButton, QSplitter,
    QTableWidget, QTableWidgetItem, QVBoxLayout, QHBoxLayout, QWidget,
    QMenuBar, QToolBar,
)

from hen_guide_dialog import HenGuideDialog
from pkg_guide_dialog import PkgGuideDialog
from models import ConsoleInfo, ConsoleType, GameEntry, TransferJob
from settings_dialog import SettingsDialog
from tray import SystemTray, set_autostart
from ftp_worker import MAX_RETRIES

if TYPE_CHECKING:
    from app_controller import AppController

_FORMAT_BADGE = {
    "folder": "CARPETA",
    "iso": "ISO",
    "iso_set": "MULTI-ISO",
    "pkg": "PKG",
}


class MainWindow(QMainWindow):
    def __init__(self, ctrl: "AppController", config: dict):
        super().__init__()
        self.ctrl = ctrl
        self.config = config
        self.selected_console: Optional[ConsoleInfo] = None
        self._progress_rows: Dict[str, int] = {}
        self._job_totals: Dict[str, int] = {}
        self._job_done_count: Dict[str, int] = {}
        self._setup_ui()
        self._setup_tray()
        self._connect_controller_signals()

    # ------------------------------------------------------------------
    # Signal wiring
    # ------------------------------------------------------------------

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
        self._act_scan.triggered.connect(self.ctrl.start_scan)
        tb.addAction(self._act_scan)

        self.addToolBar(tb)

    def _open_settings(self):
        dlg = SettingsDialog(self.config, self)
        if dlg.exec() != SettingsDialog.DialogCode.Accepted:
            return
        new_cfg = dlg.get_config()

        autostart_changed = new_cfg["autostart_windows"] != self.config.get("autostart_windows", False)
        root_changed = (
            new_cfg.get("ps3_root", "") != self.config.get("ps3_root", "") or
            new_cfg.get("xbox_root", "") != self.config.get("xbox_root", "")
        )

        self.config = new_cfg
        self.ctrl.update_config(new_cfg)

        if autostart_changed:
            ok = set_autostart(new_cfg["autostart_windows"])
            if not ok and new_cfg["autostart_windows"]:
                QMessageBox.warning(
                    self, "Inicio automatico",
                    "No se pudo configurar el inicio automatico con Windows.\n"
                    "Intenta ejecutar GameLoader como administrador."
                )

        if root_changed:
            if self.selected_console:
                self.ctrl.load_catalog(self.selected_console)
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
        self.btn_scan.clicked.connect(self.ctrl.start_scan)
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
        self.btn_start_transfer.clicked.connect(self._on_start_transfer_clicked)
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

    def _safe_quit(self) -> None:
        if self.ctrl.is_transferring():
            active_count = sum(1 for w in self.ctrl.workers.values() if w.isRunning())
            resp = QMessageBox.question(
                self, "Cerrar GameLoader",
                f"Hay {active_count} transferencia(s) activa(s).\n\n"
                "Si cerras ahora los juegos en proceso quedan incompletos "
                "y tendran que cargarse de nuevo.\n\n"
                "Cerrar de todas formas?",
                QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
                QMessageBox.StandardButton.No,
            )
            if resp != QMessageBox.StandardButton.Yes:
                return
        self.ctrl.stop_all_workers()
        QApplication.instance().quit()

    def closeEvent(self, event):
        event.ignore()
        self.hide()

    # ------------------------------------------------------------------
    # Scanner signal handlers
    # ------------------------------------------------------------------

    @pyqtSlot()
    def _on_scan_started(self) -> None:
        self.btn_scan.setEnabled(False)
        self.btn_scan.setText("Buscando...")
        if hasattr(self, '_act_scan'):
            self._act_scan.setEnabled(False)

    @pyqtSlot(object)
    def _on_console_found(self, console: ConsoleInfo) -> None:
        item = QListWidgetItem(f"  {self._console_label(console)}")
        item.setData(Qt.ItemDataRole.UserRole, console.console_id)
        self.console_list.addItem(item)
        self._lbl_no_consoles.hide()

    @pyqtSlot(int)
    def _on_scan_finished(self, count: int) -> None:
        self.btn_scan.setEnabled(True)
        self.btn_scan.setText("Buscar")
        if hasattr(self, '_act_scan'):
            self._act_scan.setEnabled(True)
        if count == 0:
            self._lbl_no_consoles.show()
        else:
            self._lbl_no_consoles.hide()

    @pyqtSlot(str)
    def _on_console_online(self, console_id: str):
        self._update_console_item_state(console_id, online=True)

    @pyqtSlot(str)
    def _on_console_offline(self, console_id: str):
        self._update_console_item_state(console_id, online=False)

    def _update_console_item_state(self, console_id: str, online: bool):
        console = self.ctrl.consoles.get(console_id)
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
    # Console selection
    # ------------------------------------------------------------------

    def _on_console_clicked(self, item: QListWidgetItem) -> None:
        console_id = item.data(Qt.ItemDataRole.UserRole)
        self.selected_console = self.ctrl.consoles.get(console_id)
        if self.selected_console:
            self.ctrl.load_catalog(self.selected_console)
            self._refresh_staging_panel()
            self.btn_rename.setEnabled(True)
            self.ctrl.query_free_space(self.selected_console)

    @pyqtSlot(str, float)
    def _on_free_space_result(self, console_id: str, free_gb: float):
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
        self._lbl_free_space.show()

    @pyqtSlot(object, list, str)
    def _on_catalog_ready(self, console: ConsoleInfo, games: list, error_msg: str) -> None:
        self.search_box.clear()
        self._no_catalog_card.hide()
        self._catalog_table.setRowCount(0)

        if error_msg:
            self._catalog_table.hide()
            self.search_box.hide()
            self._no_catalog_card.show()
            root_key = "ps3_root" if console.console_type == ConsoleType.PS3 else "xbox_root"
            not_configured = not self.config.get(root_key, "")
            self._no_catalog_icon.setText("?" if not_configured else "!")
            self._no_catalog_msg.setText(error_msg)
            if not_configured:
                self._btn_cfg_from_card.show()
            else:
                self._btn_cfg_from_card.hide()
            self._lbl_catalog_count.setText("")
            return

        self._catalog_table.show()
        self.search_box.show()
        staging_names = {g.name for g in self.ctrl.get_staged(console.console_id)}

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
            btn.clicked.connect(lambda _, g=game: (
                self.ctrl.stage_game(console.console_id, g),
                self._refresh_staging_panel(),
                self._update_catalog_buttons(),
            ))
            self._catalog_table.setCellWidget(row, 2, btn)

        self._lbl_catalog_count.setText(f"{len(games)} juegos")

    def _filter_catalog(self, text: str):
        for row in range(self._catalog_table.rowCount()):
            item = self._catalog_table.item(row, 0)
            entry = item.data(Qt.ItemDataRole.UserRole) if item else None
            name = entry.name if entry else (item.text() if item else "")
            self._catalog_table.setRowHidden(row, text.lower() not in name.lower())

    @pyqtSlot(str, int)
    def _on_game_size(self, game_name: str, byte_count: int):
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
            if console.firmware_type == "CFW":
                fw_badge = "  ✓ CFW"
            elif console.hen_verified:
                fw_badge = "  ✓ HEN"
            else:
                fw_badge = "  ✗ HEN"
            wm_badge = "  [WM]" if console.webman else ""
        else:
            fw_badge = ""
            wm_badge = ""
        return f"{console.label}{fw_badge}{wm_badge}"

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
        if ip in self.ctrl.consoles:
            self._status(f"{ip} ya está en la lista de consolas.")
            return
        self.btn_add_ip.setEnabled(False)
        self.btn_add_ip.setText("Conectando...")
        self.ctrl.add_console_by_ip(ip)
        # Re-enable button after a delay — ctrl will emit status_message when done
        from PyQt6.QtCore import QTimer
        QTimer.singleShot(3000, lambda: (
            self.btn_add_ip.setEnabled(True),
            self.btn_add_ip.setText("IP..."),
        ))

    # ------------------------------------------------------------------
    # Staging
    # ------------------------------------------------------------------

    def _on_start_transfer_clicked(self) -> None:
        if self.selected_console:
            self.ctrl.commit_transfer(self.selected_console.console_id)

    def _refresh_staging_panel(self) -> None:
        console = self.selected_console
        if not console:
            return
        self._staging_title.setText(f"COLA: {console.label}")
        self._staging_list.clear()
        games = self.ctrl.get_staged(console.console_id)
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
            btn_remove.clicked.connect(lambda _, idx=i: (
                self.ctrl.unstage_game(console.console_id, idx),
                self._refresh_staging_panel(),
                self._update_catalog_buttons(),
            ))
            row_layout.addWidget(lbl, stretch=1)
            row_layout.addWidget(btn_remove)
            item.setSizeHint(row_widget.sizeHint())
            self._staging_list.addItem(item)
            self._staging_list.setItemWidget(item, row_widget)

        total_bytes = sum(
            self.ctrl._game_size_cache.get(g.name, 0)
            for g in games
        )
        n = len(games)
        if total_bytes > 0:
            total_gb = total_bytes / (1024 ** 3)
            self._staging_info.setText(f"{n} juego(s)  ·  ~{total_gb:.1f} GB")
        else:
            self._staging_info.setText(f"{n} juego(s)")
        self.btn_start_transfer.setEnabled(n > 0)

    def _update_catalog_buttons(self) -> None:
        if not self.selected_console:
            return
        staging_names = {g.name for g in self.ctrl.get_staged(self.selected_console.console_id)}
        for row in range(self._catalog_table.rowCount()):
            item = self._catalog_table.item(row, 0)
            btn = self._catalog_table.cellWidget(row, 2)
            if item and btn:
                game = item.data(Qt.ItemDataRole.UserRole)
                name = game.name if game else ""
                btn.setEnabled(name not in staging_names)

    # ------------------------------------------------------------------
    # Transfer signal handlers
    # ------------------------------------------------------------------

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

    # ------------------------------------------------------------------
    # Progress table
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
            btn.clicked.connect(lambda _, cid=console.console_id: self._cancel_transfer_ui(cid))
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
        btn.clicked.connect(lambda _, cid=console.console_id: self._cancel_transfer_ui(cid))
        self.progress_table.setCellWidget(row, 5, btn)

    def _cancel_transfer_ui(self, console_id: str) -> None:
        self.ctrl.cancel_transfer(console_id)
        row = self._find_row(console_id)
        item_st = self._safe_item(row, 4)
        if item_st:
            item_st.setText("Cancelado")
        self.progress_table.removeCellWidget(row, 5)

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
    def _on_progress(self, console_id: str, game_name: str, bytes_sent: int, total_bytes: int, mbps: float) -> None:
        # Lazily create progress row on first progress event for this console
        if self._find_row(console_id) < 0:
            console = self.ctrl.consoles.get(console_id)
            if console:
                self._job_totals[console_id] = self.ctrl._job_totals.get(console_id, 0)
                self._job_done_count[console_id] = 0
                self._upsert_progress_row(console)

        row = self._find_row(console_id)
        item_name = self._safe_item(row, 1)
        if item_name:
            job = self.ctrl._job_registry.get((console_id, game_name))
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
    def _on_job_failed(self, console_id: str, game_name: str, error_msg: str) -> None:
        row = self._find_row(console_id)
        self._job_done_count[console_id] = self._job_done_count.get(console_id, 0) + 1
        item_name = self._safe_item(row, 1)
        item_st = self._safe_item(row, 4)
        if item_name:
            item_name.setText(f"Error: {game_name}")
        if item_st:
            item_st.setText(f"Error: {error_msg[:45]}")
        self._status(f"Error en {game_name}: {error_msg[:80]}")

        job = self.ctrl._job_registry.get((console_id, game_name))
        if job:
            btn_retry = QPushButton("Reintentar")
            btn_retry.setFixedWidth(80)
            btn_retry.clicked.connect(lambda _, cid=console_id, j=job: self._retry_job_ui(cid, j))
            self.progress_table.setCellWidget(row, 5, btn_retry)

    def _retry_job_ui(self, console_id: str, job: TransferJob) -> None:
        self.ctrl.retry_job(console_id, job)
        row = self._find_row(console_id)
        item_name = self._safe_item(row, 1)
        if item_name:
            item_name.setText("Reintentando...")
        bar = self._safe_widget(row, 2)
        if bar:
            bar.setValue(0)
        btn_cancel = QPushButton("Detener")
        btn_cancel.setFixedWidth(60)
        btn_cancel.clicked.connect(lambda _, cid=console_id: self._cancel_transfer_ui(cid))
        self.progress_table.setCellWidget(row, 5, btn_cancel)

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

    def _status(self, msg: str):
        self.statusBar().showMessage(msg)
