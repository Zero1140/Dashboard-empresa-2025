import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from format_detector import GameFormat, detect_format, get_iso_files


def test_iso_file(tmp_path):
    iso = tmp_path / "juego.iso"
    iso.write_bytes(b"")
    assert detect_format(iso) == GameFormat.ISO


def test_pkg_file(tmp_path):
    pkg = tmp_path / "juego.pkg"
    pkg.write_bytes(b"")
    assert detect_format(pkg) == GameFormat.PKG


def test_folder_game(tmp_path):
    game_dir = tmp_path / "BLUS12345"
    game_dir.mkdir()
    (game_dir / "PARAM.SFO").write_bytes(b"")
    assert detect_format(game_dir) == GameFormat.FOLDER


def test_iso_set_folder(tmp_path):
    game_dir = tmp_path / "JuegoMultiDisco"
    game_dir.mkdir()
    (game_dir / "disco1.iso").write_bytes(b"")
    (game_dir / "disco2.iso").write_bytes(b"")
    assert detect_format(game_dir) == GameFormat.ISO_SET


def test_get_iso_files_returns_sorted(tmp_path):
    game_dir = tmp_path / "JuegoMultiDisco"
    game_dir.mkdir()
    (game_dir / "disco2.iso").write_bytes(b"")
    (game_dir / "disco1.iso").write_bytes(b"")
    files = get_iso_files(game_dir)
    assert [f.name for f in files] == ["disco1.iso", "disco2.iso"]


def test_iso_set_folder_with_other_files(tmp_path):
    game_dir = tmp_path / "JuegoConInfo"
    game_dir.mkdir()
    (game_dir / "juego.iso").write_bytes(b"")
    (game_dir / "readme.txt").write_bytes(b"")
    assert detect_format(game_dir) == GameFormat.ISO_SET


def test_folder_with_subdir_iso_is_still_folder(tmp_path):
    """ISOs en subdirectorios no cuentan como ISO_SET."""
    game_dir = tmp_path / "BLUS99999"
    game_dir.mkdir()
    sub = game_dir / "data"
    sub.mkdir()
    (sub / "archivo.iso").write_bytes(b"")
    assert detect_format(game_dir) == GameFormat.FOLDER
