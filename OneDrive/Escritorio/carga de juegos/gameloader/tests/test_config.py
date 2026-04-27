import pytest
from pathlib import Path
from config import load_config, save_config


def test_load_config_returns_defaults_when_no_file(tmp_path):
    cfg = load_config(tmp_path / "config.json")
    assert cfg["ps3_remote_path"] == "/dev_hdd0/GAMES/"
    assert cfg["xbox_remote_path"] == "Hdd1:\Games\\"
    assert cfg["scan_interval_seconds"] == 30
    assert cfg["overwrite_existing"] == False
    assert cfg["hdd_root"] == ""


def test_save_and_load_roundtrip(tmp_path):
    cfg_path = tmp_path / "config.json"
    cfg = load_config(cfg_path)
    cfg["hdd_root"] = "D:\Juegos"
    save_config(cfg, cfg_path)
    loaded = load_config(cfg_path)
    assert loaded["hdd_root"] == "D:\Juegos"


def test_load_merges_missing_keys(tmp_path):
    cfg_path = tmp_path / "config.json"
    import json
    cfg_path.write_text(json.dumps({"hdd_root": "D:\Juegos"}))
    cfg = load_config(cfg_path)
    assert cfg["ps3_remote_path"] == "/dev_hdd0/GAMES/"
    assert cfg["hdd_root"] == "D:\Juegos"
