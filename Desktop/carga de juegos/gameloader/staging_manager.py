from pathlib import Path
from typing import Dict, List

from models import GameEntry


class StagingManager:
    def __init__(self):
        self._staging: Dict[str, List[GameEntry]] = {}

    def add(self, console_id: str, game: GameEntry) -> None:
        if console_id not in self._staging:
            self._staging[console_id] = []
        if not any(g.name == game.name for g in self._staging[console_id]):
            self._staging[console_id].append(game)

    def remove(self, console_id: str, index: int) -> None:
        lst = self._staging.get(console_id)
        if lst is not None and 0 <= index < len(lst):
            lst.pop(index)

    def get(self, console_id: str) -> List[GameEntry]:
        return list(self._staging.get(console_id, []))

    def clear(self, console_id: str) -> None:
        self._staging.pop(console_id, None)

    def total_size_gb(self, console_id: str) -> float:
        total = sum(
            self._folder_size(g.local_path)
            for g in self._staging.get(console_id, [])
        )
        return total / (1024 ** 3)

    def _folder_size(self, path: Path) -> int:
        try:
            return sum(f.stat().st_size for f in Path(path).rglob("*") if f.is_file())
        except (PermissionError, OSError):
            return 0
