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
