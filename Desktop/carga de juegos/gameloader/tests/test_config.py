import pytest
from pathlib import Path
from config import load_config, save_config


def test_load_config_returns_defaults_when_no_file(tmp_path):
    cfg = load_config(tmp_path / "config.json")
    assert cfg["ps3_remote_path"] == "/dev_hdd0/GAMES/"
    assert cfg["xbox_remote_path"] == "Hdd1:\\Games\\"
    assert cfg["scan_interval_seconds"] == 30
    assert cfg["overwrite_existing"] == False
    assert cfg["ps3_root"] == ""
    assert cfg["xbox_root"] == ""
    assert cfg["ps3_iso_path"] == "/dev_hdd0/PS3ISO/"
    assert cfg["ps3_pkg_path"] == "/dev_hdd0/packages/"


def test_save_and_load_roundtrip(tmp_path):
    cfg_path = tmp_path / "config.json"
    cfg = load_config(cfg_path)
    cfg["ps3_root"] = "D:\\Juegos PS3"
    cfg["xbox_root"] = "E:\\Juegos Xbox"
    save_config(cfg, cfg_path)
    loaded = load_config(cfg_path)
    assert loaded["ps3_root"] == "D:\\Juegos PS3"
    assert loaded["xbox_root"] == "E:\\Juegos Xbox"


def test_load_merges_missing_keys(tmp_path):
    cfg_path = tmp_path / "config.json"
    import json
    cfg_path.write_text(json.dumps({"ps3_root": "D:\\Juegos PS3"}))
    cfg = load_config(cfg_path)
    assert cfg["ps3_remote_path"] == "/dev_hdd0/GAMES/"
    assert cfg["ps3_root"] == "D:\\Juegos PS3"
    assert cfg["xbox_root"] == ""
    assert cfg["ps3_iso_path"] == "/dev_hdd0/PS3ISO/"
    assert cfg["ps3_pkg_path"] == "/dev_hdd0/packages/"


def test_load_merges_new_keys_into_old_config(tmp_path):
    """Config viejo sin ps3_iso_path/ps3_pkg_path debe recibirlos al cargar."""
    old = tmp_path / "config.json"
    import json
    old.write_text(json.dumps({"ps3_root": "/games", "xbox_root": ""}), encoding="utf-8")

    from config import load_config
    cfg = load_config(old)
    assert cfg["ps3_iso_path"] == "/dev_hdd0/PS3ISO/"
    assert cfg["ps3_pkg_path"] == "/dev_hdd0/packages/"
    assert cfg["ps3_root"] == "/games"  # valor viejo preservado
