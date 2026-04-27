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
    app_path = sys.executable
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
