"""
Módulo de encriptación para PII de datos de salud.
Diseñado con KeyProvider pluggable para facilitar migración futura:
  FernetKeyProvider (hoy) → AWSKMSKeyProvider / HashiCorpVaultKeyProvider (cuando escale)
"""
import hashlib
import hmac as _hmac
import logging
from abc import ABC, abstractmethod

from cryptography.fernet import Fernet
from sqlalchemy import String, TypeDecorator


class KeyProvider(ABC):
    @abstractmethod
    def get_key(self) -> bytes: ...


class FernetKeyProvider(KeyProvider):
    """
    Carga la clave de encriptación desde la variable de entorno ENCRYPTION_KEY.
    Si no está definida (desarrollo), genera una clave temporal estable para el
    ciclo de vida del proceso, con advertencia en logs.
    """

    _dev_key: bytes | None = None

    def get_key(self) -> bytes:
        from app.core.config import settings
        key = settings.encryption_key
        if not key:
            # Solo permitido en desarrollo
            if settings.is_production:
                raise RuntimeError("ENCRYPTION_KEY es obligatoria en producción")
            if self._dev_key is None:
                logging.getLogger(__name__).warning(
                    "ENCRYPTION_KEY no definida — usando clave temporal de desarrollo. "
                    "Los datos NO serán persistibles entre reinicios."
                )
                FernetKeyProvider._dev_key = Fernet.generate_key()
            return FernetKeyProvider._dev_key
        return key.encode() if isinstance(key, str) else key


_provider: KeyProvider = FernetKeyProvider()


def get_fernet() -> Fernet:
    return Fernet(_provider.get_key())


def hmac_sha256(value: str) -> str:
    """
    HMAC-SHA256 determinístico para crear índices de búsqueda sobre campos encriptados.
    Usa HMAC_SECRET del config como clave. Si no está definida, usa una clave fija de dev.
    """
    from app.core.config import settings
    secret = settings.hmac_secret or "dev-hmac-secret-change-in-production"
    return _hmac.new(
        secret.encode(),
        value.encode(),
        hashlib.sha256,
    ).hexdigest()


class EncryptedString(TypeDecorator):
    """
    SQLAlchemy TypeDecorator que encripta transparentemente con Fernet (AES-128-CBC).
    Almacena el ciphertext como texto en la columna subyacente.
    Para búsquedas exactas, usar la columna *_hash correspondiente con hmac_sha256().
    """

    impl = String
    cache_ok = True  # Safe: no per-instance key state; key is fetched dynamically via get_fernet()

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return get_fernet().encrypt(value.encode()).decode()

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        # Raises InvalidToken if value is not Fernet ciphertext.
        # Migration 006 must complete before this decorator is active on live columns.
        return get_fernet().decrypt(value.encode()).decode()
