from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path


class ConsoleType(Enum):
    PS3 = "PS3"
    XBOX = "Xbox"


@dataclass
class ConsoleInfo:
    ip: str
    console_type: ConsoleType
    label: str  # ej: "PS3-105", renombrable con nombre del cliente

    @property
    def console_id(self) -> str:
        return self.label


@dataclass
class GameEntry:
    name: str
    local_path: Path
    console_type: ConsoleType


@dataclass
class TransferJob:
    game: GameEntry
    remote_base_path: str  # "/dev_hdd0/GAMES/" o "Hdd1:\\Games\\"
    status: str = "pending"   # pending | transferring | done | failed | skipped
    error_msg: str = ""
