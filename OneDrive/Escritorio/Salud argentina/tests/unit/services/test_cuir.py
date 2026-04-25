import hashlib

from app.services.cuir import generate_cuir


def test_cuir_is_27_chars():
    assert len(generate_cuir("DEVP")) == 27


def test_cuir_starts_with_prefix():
    cuir = generate_cuir("TEST")
    assert cuir[:4] == "TEST"


def test_short_prefix_is_padded():
    cuir = generate_cuir("AB")
    assert cuir[:4] == "ABXX"


def test_long_prefix_is_truncated():
    cuir = generate_cuir("TOOLONG")
    assert cuir[:4] == "TOOL"


def test_cuir_uniqueness():
    cuirs = {generate_cuir("DEVP") for _ in range(200)}
    assert len(cuirs) == 200


def test_checksum_is_correct():
    cuir = generate_cuir("TEST")
    raw = cuir[:-2]
    expected_checksum = hashlib.md5(raw.encode()).hexdigest()[:2].upper()
    assert cuir[-2:] == expected_checksum
