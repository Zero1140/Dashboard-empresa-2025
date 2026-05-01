import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from PyQt6.QtWidgets import QApplication, QMessageBox
from config import load_config
from main_window import MainWindow

APP_STYLE = """
QWidget {
    background-color: #12121f;
    color: #d0d0e8;
    font-family: "Segoe UI", Arial, sans-serif;
    font-size: 13px;
}
QMainWindow { background-color: #0e0e1c; }
QDialog { background-color: #12121f; }

QMenuBar {
    background-color: #0e0e1c;
    color: #b0b0cc;
    border-bottom: 1px solid #1e1e38;
    padding: 2px;
}
QMenuBar::item { padding: 4px 12px; border-radius: 3px; }
QMenuBar::item:selected { background-color: #1e1e38; }
QMenu {
    background-color: #1a1a2e;
    border: 1px solid #252545;
    border-radius: 4px;
    padding: 4px;
}
QMenu::item { padding: 5px 24px; border-radius: 3px; }
QMenu::item:selected { background-color: #252550; }
QMenu::separator { background-color: #252545; height: 1px; margin: 4px 8px; }

QToolBar {
    background-color: #0e0e1c;
    border-bottom: 1px solid #1a1a30;
    padding: 3px 8px;
    spacing: 6px;
}

QListWidget {
    background-color: #1a1a2e;
    border: 1px solid #252545;
    border-radius: 6px;
    outline: none;
}
QListWidget::item { padding: 7px 10px; border-radius: 4px; }
QListWidget::item:hover { background-color: #1e1e3a; }
QListWidget::item:selected { background-color: #28285a; color: #9898e8; }

QTableWidget {
    background-color: #1a1a2e;
    border: 1px solid #252545;
    border-radius: 6px;
    gridline-color: #1e1e38;
    outline: none;
    alternate-background-color: #1c1c34;
}
QTableWidget::item { padding: 4px 6px; border: none; }
QTableWidget::item:hover { background-color: #1e1e3a; }
QHeaderView { background-color: #1a1a2e; }
QHeaderView::section {
    background-color: #141428;
    color: #6868a0;
    border: none;
    border-bottom: 1px solid #252545;
    padding: 5px 8px;
    font-size: 11px;
    font-weight: bold;
}

QPushButton {
    background-color: #20203a;
    color: #c0c0e0;
    border: 1px solid #303060;
    border-radius: 5px;
    padding: 5px 14px;
    min-height: 26px;
}
QPushButton:hover {
    background-color: #2a2a50;
    border-color: #5050a0;
    color: #e0e0ff;
}
QPushButton:pressed { background-color: #18183a; }
QPushButton:disabled {
    background-color: #141420;
    color: #383858;
    border-color: #1e1e38;
}

QPushButton#btn_start {
    background-color: #0d2a18;
    color: #28d86a;
    font-weight: bold;
    font-size: 14px;
    border: 1px solid #1a5030;
    border-radius: 6px;
    padding: 8px;
    min-height: 42px;
}
QPushButton#btn_start:hover {
    background-color: #163d25;
    border-color: #28a050;
    color: #40ff80;
}
QPushButton#btn_start:pressed { background-color: #0a1e12; }
QPushButton#btn_start:disabled {
    background-color: #0a140e;
    color: #1a3020;
    border-color: #0e1e14;
}

QPushButton#btn_cfg_big {
    background-color: #1a1a38;
    color: #7878f0;
    border: 2px solid #2a2a70;
    border-radius: 8px;
    font-size: 14px;
    font-weight: bold;
    padding: 14px 28px;
    min-height: 52px;
}
QPushButton#btn_cfg_big:hover {
    background-color: #22224a;
    border-color: #5050d0;
    color: #9898ff;
}

QLineEdit {
    background-color: #1a1a2e;
    color: #d0d0e8;
    border: 1px solid #252545;
    border-radius: 5px;
    padding: 5px 10px;
    min-height: 26px;
    selection-background-color: #3030a0;
}
QLineEdit:focus { border-color: #4040b0; }
QLineEdit::placeholder { color: #505080; }

QLabel { color: #d0d0e8; background: transparent; }

QProgressBar {
    background-color: #1a1a30;
    border: none;
    border-radius: 4px;
    min-height: 14px;
    max-height: 14px;
    color: transparent;
}
QProgressBar::chunk {
    background: qlineargradient(x1:0,y1:0,x2:1,y2:0,stop:0 #2244ee,stop:1 #8833dd);
    border-radius: 4px;
}

QStatusBar {
    background-color: #0a0a18;
    color: #4848a0;
    border-top: 1px solid #16163a;
    font-size: 12px;
}
QStatusBar::item { border: none; }

QSplitter::handle { background-color: #1a1a30; }
QSplitter::handle:horizontal { width: 3px; }
QSplitter::handle:horizontal:hover { background-color: #3030a0; }

QFrame[frameShape="4"] {
    border: 1px solid #252545;
    border-radius: 8px;
    background-color: #131325;
}

QGroupBox {
    border: 1px solid #252545;
    border-radius: 6px;
    margin-top: 10px;
    padding-top: 14px;
    color: #7070b8;
    font-weight: bold;
}
QGroupBox::title {
    subcontrol-origin: margin;
    left: 12px;
    padding: 0 4px;
    color: #7878c0;
}

QCheckBox { color: #c0c0e0; spacing: 8px; }
QCheckBox::indicator {
    width: 16px; height: 16px;
    border-radius: 3px;
    border: 1px solid #303060;
    background-color: #1a1a2e;
}
QCheckBox::indicator:checked { background-color: #3030a0; border-color: #5050e0; }

QSpinBox {
    background-color: #1a1a2e;
    color: #d0d0e8;
    border: 1px solid #252545;
    border-radius: 5px;
    padding: 4px 8px;
    min-height: 26px;
}
QSpinBox::up-button, QSpinBox::down-button {
    background-color: #20203a;
    border: none;
    width: 18px;
}
QSpinBox::up-button:hover, QSpinBox::down-button:hover { background-color: #2a2a50; }

QDialogButtonBox QPushButton { min-width: 90px; }

QScrollBar:vertical {
    background-color: #0e0e1c;
    width: 8px;
    border-radius: 4px;
}
QScrollBar::handle:vertical {
    background-color: #28284a;
    border-radius: 4px;
    min-height: 24px;
}
QScrollBar::handle:vertical:hover { background-color: #4040a0; }
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical { height: 0px; }

QScrollBar:horizontal {
    background-color: #0e0e1c;
    height: 8px;
    border-radius: 4px;
}
QScrollBar::handle:horizontal {
    background-color: #28284a;
    border-radius: 4px;
    min-width: 24px;
}
QScrollBar::handle:horizontal:hover { background-color: #4040a0; }
QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal { width: 0px; }
"""


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
        ctrl.start_scan()
        window.show()
    except Exception as e:
        QMessageBox.critical(
            None,
            "Error al iniciar GameLoader",
            f"No se pudo abrir la ventana principal:\n\n{e}\n\n"
            "Intenta reinstalar la aplicacion."
        )
        sys.exit(1)

    sys.exit(app.exec())


if __name__ == "__main__":
    main()
