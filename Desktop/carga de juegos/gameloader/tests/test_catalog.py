import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from catalog import load_catalog
from models import ConsoleType


def test_load_ps3_games(tmp_path):
    game_dir = tmp_path / "God of War 3"
    game_dir.mkdir()
    (game_dir / "PS3_GAME").mkdir()
    (game_dir / "PS3_GAME" / "PARAM.SFO").write_bytes(b"fake")

    games, err = load_catalog(str(tmp_path), ConsoleType.PS3)
    assert err == ""
    assert len(games) == 1
    assert games[0].name == "God of War 3"
    assert games[0].console_type == ConsoleType.PS3
    assert games[0].local_path == game_dir


def test_load_xbox_games(tmp_path):
    game_dir = tmp_path / "GTA V"
    game_dir.mkdir()
    (game_dir / "default.xex").write_bytes(b"fake")

    games, err = load_catalog(str(tmp_path), ConsoleType.XBOX)
    assert err == ""
    assert len(games) == 1
    assert games[0].name == "GTA V"
    assert games[0].console_type == ConsoleType.XBOX


def test_empty_game_folder_excluded(tmp_path):
    (tmp_path / "Empty Game").mkdir()

    games, err = load_catalog(str(tmp_path), ConsoleType.PS3)
    assert games == []
    assert err != ""


def test_missing_root_returns_error(tmp_path):
    games, err = load_catalog("", ConsoleType.PS3)
    assert games == []
    assert "PS3" in err


def test_missing_xbox_root_returns_error(tmp_path):
    games, err = load_catalog("", ConsoleType.XBOX)
    assert games == []
    assert "Xbox" in err


def test_nonexistent_root_returns_error(tmp_path):
    games, err = load_catalog("Z:\\NoExiste\\ParaNada", ConsoleType.PS3)
    assert games == []
    assert err != ""


def test_games_sorted_alphabetically(tmp_path):
    for name in ["Zelda", "Assassin's Creed", "Batman"]:
        d = tmp_path / name
        d.mkdir()
        (d / "file.bin").write_bytes(b"x")

    games, err = load_catalog(str(tmp_path), ConsoleType.PS3)
    assert err == ""
    assert [g.name for g in games] == ["Assassin's Creed", "Batman", "Zelda"]


from format_detector import GameFormat


def test_iso_file_appears_in_catalog(tmp_path):
    iso = tmp_path / "Gran Turismo.iso"
    iso.write_bytes(b"x" * 64)
    games, err = load_catalog(str(tmp_path), ConsoleType.PS3)
    assert err == ""
    assert len(games) == 1
    assert games[0].name == "Gran Turismo.iso"
    assert games[0].format == GameFormat.ISO


def test_pkg_file_appears_in_catalog(tmp_path):
    pkg = tmp_path / "DLC Pack.pkg"
    pkg.write_bytes(b"x" * 64)
    games, err = load_catalog(str(tmp_path), ConsoleType.PS3)
    assert err == ""
    assert len(games) == 1
    assert games[0].name == "DLC Pack.pkg"
    assert games[0].format == GameFormat.PKG


def test_iso_set_folder_detected(tmp_path):
    iso_dir = tmp_path / "Multi Disc Game"
    iso_dir.mkdir()
    (iso_dir / "disco1.iso").write_bytes(b"x" * 64)
    (iso_dir / "disco2.iso").write_bytes(b"x" * 64)
    games, err = load_catalog(str(tmp_path), ConsoleType.PS3)
    assert err == ""
    assert len(games) == 1
    assert games[0].format == GameFormat.ISO_SET


def test_folder_game_format_is_folder(tmp_path):
    game_dir = tmp_path / "God of War 3"
    game_dir.mkdir()
    (game_dir / "EBOOT.BIN").write_bytes(b"x")
    games, err = load_catalog(str(tmp_path), ConsoleType.PS3)
    assert err == ""
    assert games[0].format == GameFormat.FOLDER


def test_catalog_mixed_formats(tmp_path):
    """ISO, PKG y FOLDER conviven en el mismo root."""
    (tmp_path / "game.iso").write_bytes(b"x")
    (tmp_path / "dlc.pkg").write_bytes(b"x")
    folder = tmp_path / "BLUS12345"
    folder.mkdir()
    (folder / "EBOOT.BIN").write_bytes(b"x")
    games, err = load_catalog(str(tmp_path), ConsoleType.PS3)
    assert err == ""
    assert len(games) == 3
    formats = {g.format for g in games}
    assert GameFormat.ISO in formats
    assert GameFormat.PKG in formats
    assert GameFormat.FOLDER in formats


def test_non_game_files_ignored(tmp_path):
    """Archivos que no son .iso ni .pkg se ignoran."""
    (tmp_path / "notas.txt").write_bytes(b"x")
    (tmp_path / "thumbs.db").write_bytes(b"x")
    games, err = load_catalog(str(tmp_path), ConsoleType.PS3)
    assert games == []
    assert err != ""
