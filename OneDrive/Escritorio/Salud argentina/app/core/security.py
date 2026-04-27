from datetime import UTC, datetime, timedelta

import bcrypt
from jose import JWTError, jwt
from pydantic import BaseModel

from app.core.config import settings


class TokenPayload(BaseModel):
    sub: str
    tenant_id: str
    role: str
    exp: datetime


def hash_password(password: str) -> str:
    """Hash password using bcrypt directly (bypasses passlib/bcrypt 4.x incompatibility)."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify password using bcrypt directly."""
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, tenant_id: str, role: str) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {
        "sub": user_id,
        "tenant_id": tenant_id,
        "role": role,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> TokenPayload:
    try:
        raw = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return TokenPayload(**raw)
    except JWTError as e:
        raise ValueError(f"Token inválido: {e}") from e
