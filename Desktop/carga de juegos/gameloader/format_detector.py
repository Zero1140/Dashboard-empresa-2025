from enum import Enum
from pathlib import Path


class GameFormat(Enum):
    FOLDER = "folder"
    ISO = "iso"
    ISO_SET = "iso_set"
    PKG = "pkg"


def detect_format(path: Path) -> GameFormat:
    if not path.exists():
        raise FileNotFoundError(f"Juego no encontrado: {path}")

    if path.is_file():
        suffix = path.suffix.lower()
        if suffix == ".iso":
            return GameFormat.ISO
        if suffix == ".pkg":
            return GameFormat.PKG
        raise ValueError(f"Formato de archivo no reconocido: {path.suffix!r}")

    iso_files = [f for f in path.iterdir() if f.is_file() and f.suffix.lower() == ".iso"]
    if iso_files:
        return GameFormat.ISO_SET
    return GameFormat.FOLDER


def get_iso_files(path: Path) -> list[Path]:
    return sorted(
        (f for f in path.iterdir() if f.is_file() and f.suffix.lower() == ".iso"),
        key=lambda f: f.name,
    )


def remote_path_for_format(fmt: GameFormat, config: dict) -> str:
    if fmt in (GameFormat.ISO, GameFormat.ISO_SET):
        return config.get("ps3_iso_path", "/dev_hdd0/PS3ISO/")
    if fmt == GameFormat.PKG:
        return config.get("ps3_pkg_path", "/dev_hdd0/packages/")
    return config.get("ps3_remote_path", "/dev_hdd0/GAMES/")
