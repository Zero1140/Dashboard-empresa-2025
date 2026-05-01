import json
import os
import sys
from pathlib import Path

DEFAULT_CONFIG = {
    "ps3_root": "",
    "xbox_root": "",
    "ps3_remote_path": "/dev_hdd0/GAMES/",
    "ps3_iso_path": "/dev_hdd0/PS3ISO/",
    "ps3_pkg_path": "/dev_hdd0/packages/",
    "xbox_remote_path": "Hdd1:\\Games\\",
    "scan_interval_seconds": 30,
    "scan_subnet": "",
    "autostart_windows": False,
    "auto_mode": False,
    "overwrite_existing": False,
}


def _config_dir() -> Path:
    if getattr(sys, "frozen", False):
        base = Path(os.environ.get("APPDATA", Path.home() / "AppData" / "Roaming"))
        d = base / "GameLoader"
    else:
        d = Path(__file__).parent
    d.mkdir(parents=True, exist_ok=True)
    return d


CONFIG_FILE = _config_dir() / "config.json"


def load_config(path: Path = CONFIG_FILE) -> dict:
    if not path.exists():
        return DEFAULT_CONFIG.copy()
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        # Merge con defaults para keys faltantes en versiones viejas
        return {**DEFAULT_CONFIG, **data}
    except json.JSONDecodeError:
        # Config corrupta: hacer backup y resetear
        _backup_corrupt(path)
        return DEFAULT_CONFIG.copy()
    except OSError:
        return DEFAULT_CONFIG.copy()


def save_config(config: dict, path: Path = CONFIG_FILE) -> bool:
    """Guarda la config. Devuelve True si OK, False si falló."""
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2)
        return True
    except OSError:
        return False


def _backup_corrupt(path: Path) -> None:
    try:
        backup = path.with_suffix(".json.bak")
        path.rename(backup)
    except OSError:
        pass
