import json
from pathlib import Path

DEFAULT_CONFIG = {
    "hdd_root": "",
    "ps3_remote_path": "/dev_hdd0/GAMES/",
    "xbox_remote_path": "Hdd1:\Games\\",
    "scan_interval_seconds": 30,
    "autostart_windows": False,
    "overwrite_existing": False,
}

CONFIG_FILE = Path(__file__).parent / "config.json"


def load_config(path: Path = CONFIG_FILE) -> dict:
    if path.exists():
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        return {**DEFAULT_CONFIG, **data}
    return DEFAULT_CONFIG.copy()


def save_config(config: dict, path: Path = CONFIG_FILE) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)
