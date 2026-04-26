import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal, get_db
from app.core.limiter import limiter
from app.core.security import create_access_token, verify_password
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Autenticación"])


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: str
    expires_in: int


class RefreshRequest(BaseModel):
    refresh_token: str


@limiter.limit("10/minute")
@router.post("/token", response_model=TokenResponse)
async def login(
    request: Request,
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == form.username, User.activo == True))
    user = result.scalar_one_or_none()

    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        user_id=str(user.id),
        tenant_id=str(user.tenant_id),
        role=user.role,
    )

    # Create refresh token
    refresh_value = secrets.token_hex(32)
    refresh_hash = hashlib.sha256(refresh_value.encode()).hexdigest()
    expires_at = datetime.now(tz=timezone.utc) + timedelta(days=settings.jwt_refresh_expire_days)

    async with AsyncSessionLocal() as session:
        await session.execute(
            text("""
                INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, ip_address)
                VALUES (gen_random_uuid(), :user_id, :token_hash, :expires_at, :ip)
            """),
            {
                "user_id": str(user.id),
                "token_hash": refresh_hash,
                "expires_at": expires_at,
                "ip": request.client.host if request.client else None,
            },
        )
        await session.commit()

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        refresh_token=refresh_value,
        expires_in=settings.jwt_expire_minutes * 60,
    )


@limiter.limit("20/minute")
@router.post("/refresh")
async def refresh_token(request: Request, body: RefreshRequest):
    token_hash = hashlib.sha256(body.refresh_token.encode()).hexdigest()
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            text("""
                SELECT id, user_id, expires_at, revoked
                FROM refresh_tokens WHERE token_hash = :h
            """),
            {"h": token_hash},
        )
        row = result.fetchone()

    if not row or row.revoked:
        raise HTTPException(status_code=401, detail="Token de actualización inválido")
    if row.expires_at.replace(tzinfo=timezone.utc) < datetime.now(tz=timezone.utc):
        raise HTTPException(status_code=401, detail="Token de actualización expirado")

    # Look up user and issue new access token
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == row.user_id))
        user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")

    new_token = create_access_token(
        user_id=str(user.id),
        tenant_id=str(user.tenant_id),
        role=user.role,
    )
    return {"access_token": new_token, "token_type": "bearer"}


@router.post("/logout")
async def logout(body: RefreshRequest):
    token_hash = hashlib.sha256(body.refresh_token.encode()).hexdigest()
    async with AsyncSessionLocal() as db:
        await db.execute(
            text("UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = :h"),
            {"h": token_hash},
        )
        await db.commit()
    return {"message": "Sesión cerrada"}
