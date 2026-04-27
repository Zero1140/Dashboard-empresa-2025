import sys
import os

# Asegura que los módulos locales sean encontrados sin importar desde dónde se ejecute
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from PyQt6.QtWidgets import QApplication, QFileDialog, QMessageBox
from config import load_config, save_config
from main_window import MainWindow


def run_setup_wizard() -> str:
    QMessageBox.information(
        None,
        "GameLoader — Configuración inicial",
        "Bienvenido a GameLoader.\n\n"
        "Seleccióná la carpeta raíz donde guardás tus juegos.\n"
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
