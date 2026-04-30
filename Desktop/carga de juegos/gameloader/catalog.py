from pathlib import Path
from typing import List, Tuple

from PyQt6.QtCore import QThread, pyqtSignal

from format_detector import GameFormat, detect_format
from models import GameEntry, ConsoleType

_GAME_EXTENSIONS = {".iso", ".pkg"}


def load_catalog(root: str, console_type: ConsoleType) -> Tuple[List[GameEntry], str]:
    """Returns (game_list, error_message). error_message is '' when OK."""
    label = "PS3" if console_type == ConsoleType.PS3 else "Xbox"

    if not root:
        return [], f"No hay carpeta de {label} configurada. Abri Archivo -> Configuracion."

    base_path = Path(root)
    if not base_path.exists():
        return [], f"La carpeta '{root}' no existe. Revisa la configuracion."

    try:
        entries = sorted(base_path.iterdir(), key=lambda p: p.name.lower())
    except PermissionError:
        return [], f"Sin permisos para leer '{base_path}'. Verifica los permisos de la carpeta."
    except OSError as e:
        return [], f"Error al leer la carpeta de juegos: {e}"

    games = []
    for item in entries:
        try:
            if item.is_file():
                if item.suffix.lower() not in _GAME_EXTENSIONS:
                    continue
                fmt = detect_format(item)
                games.append(GameEntry(
                    name=item.name,
                    local_path=item,
                    console_type=console_type,
                    format=fmt,
                ))
            elif item.is_dir():
                fmt = detect_format(item)
                if fmt == GameFormat.FOLDER and not _has_files(item):
                    continue
                games.append(GameEntry(
                    name=item.name,
                    local_path=item,
                    console_type=console_type,
                    format=fmt,
                ))
        except (PermissionError, OSError, ValueError):
            pass

    if not games:
        return [], (
            f"La carpeta '{root}' existe pero no tiene juegos.\n"
            f"Coloca juegos en subcarpetas, o archivos .iso / .pkg directamente."
        )

    return games, ""


def _has_files(folder: Path) -> bool:
    try:
        return any(True for _ in folder.rglob("*") if _.is_file())
    except (PermissionError, OSError):
        return False


class CatalogSizeWorker(QThread):
    size_ready = pyqtSignal(str, int)  # game_name, bytes
    all_done = pyqtSignal()

    def __init__(self, games: List[GameEntry], parent=None):
        super().__init__(parent)
        self._games = list(games)

    def run(self):
        for game in self._games:
            try:
                if game.local_path.is_file():
                    total = game.local_path.stat().st_size
                else:
                    total = sum(
                        f.stat().st_size
                        for f in game.local_path.rglob("*")
                        if f.is_file()
                    )
            except (PermissionError, OSError):
                total = 0
            self.size_ready.emit(game.name, total)
        self.all_done.emit()
