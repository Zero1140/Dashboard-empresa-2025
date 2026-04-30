from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path

from format_detector import GameFormat


class ConsoleType(Enum):
    PS3 = "PS3"
    XBOX = "Xbox"


@dataclass
class ConsoleInfo:
    ip: str
    console_type: ConsoleType
    label: str
    hen_verified: bool = False
    webman: bool = False

    @property
    def console_id(self) -> str:
        return self.ip


@dataclass
class GameEntry:
    name: str
    local_path: Path
    console_type: ConsoleType
    format: GameFormat = GameFormat.FOLDER


@dataclass
class TransferJob:
    game: GameEntry
    remote_base_path: str
    attempts: int = 0
