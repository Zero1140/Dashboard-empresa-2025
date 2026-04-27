import pytest
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from catalog import load_catalog
from models import ConsoleType


def test_load_ps3_games(tmp_path):
    ps3_dir = tmp_path / "PS3"
    ps3_dir.mkdir()
    game_dir = ps3_dir / "God of War 3"
    game_dir.mkdir()
    (game_dir / "PS3_GAME").mkdir()
    (game_dir / "PS3_GAME" / "PARAM.SFO").write_bytes(b"fake")

    games = load_catalog(str(tmp_path), ConsoleType.PS3)
    assert len(games) == 1
    assert games[0].name == "God of War 3"
    assert games[0].console_type == ConsoleType.PS3
    assert games[0].local_path == game_dir


def test_load_xbox_games(tmp_path):
    xbox_dir = tmp_path / "Xbox"
    xbox_dir.mkdir()
    game_dir = xbox_dir / "GTA V"
    game_dir.mkdir()
    (game_dir / "default.xex").write_bytes(b"fake")

    games = load_catalog(str(tmp_path), ConsoleType.XBOX)
    assert len(games) == 1
    assert games[0].name == "GTA V"
    assert games[0].console_type == ConsoleType.XBOX


def test_empty_game_folder_excluded(tmp_path):
    ps3_dir = tmp_path / "PS3"
    ps3_dir.mkdir()
    (ps3_dir / "Empty Game").mkdir()  # carpeta vacía

    games = load_catalog(str(tmp_path), ConsoleType.PS3)
    assert games == []


def test_missing_console_folder_returns_empty(tmp_path):
    games = load_catalog(str(tmp_path), ConsoleType.PS3)
    assert games == []


def test_games_sorted_alphabetically(tmp_path):
    ps3_dir = tmp_path / "PS3"
    ps3_dir.mkdir()
    for name in ["Zelda", "Assassin's Creed", "Batman"]:
        d = ps3_dir / name
        d.mkdir()
        (d / "file.bin").write_bytes(b"x")

    games = load_catalog(str(tmp_path), ConsoleType.PS3)
    assert [g.name for g in games] == ["Assassin's Creed", "Batman", "Zelda"]
