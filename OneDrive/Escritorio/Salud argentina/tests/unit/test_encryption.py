import pytest
from app.core.encryption import EncryptedString, hmac_sha256, get_fernet


def test_encrypted_string_roundtrip():
    """EncryptedString encripta y desencripta correctamente."""
    col = EncryptedString()
    original = "12345678"
    encrypted = col.process_bind_param(original, dialect=None)
    assert encrypted != original
    assert original not in encrypted
    recovered = col.process_result_value(encrypted, dialect=None)
    assert recovered == original


def test_encrypted_string_none():
    """EncryptedString maneja None sin error."""
    col = EncryptedString()
    assert col.process_bind_param(None, dialect=None) is None
    assert col.process_result_value(None, dialect=None) is None


def test_hmac_sha256_deterministic():
    """El mismo valor siempre produce el mismo hash."""
    h1 = hmac_sha256("12345678")
    h2 = hmac_sha256("12345678")
    assert h1 == h2
    assert len(h1) == 64  # SHA256 hex = 64 chars


def test_hmac_sha256_different_values():
    """Valores distintos producen hashes distintos."""
    h1 = hmac_sha256("12345678")
    h2 = hmac_sha256("87654321")
    assert h1 != h2


def test_encrypted_string_different_ciphertexts():
    """Fernet usa IV aleatorio — el mismo valor encripta distinto cada vez."""
    col = EncryptedString()
    c1 = col.process_bind_param("12345678", dialect=None)
    c2 = col.process_bind_param("12345678", dialect=None)
    assert c1 != c2  # diferente IV, diferente ciphertext
