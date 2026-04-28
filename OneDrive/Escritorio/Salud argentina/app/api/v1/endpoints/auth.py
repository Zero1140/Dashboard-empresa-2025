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
from app.core.security import create_access_token, hash_password, verify_password
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User
from app.services.email import send_password_reset_email

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


class PasswordResetRequest(BaseModel):
    email: str


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


@router.post("/password-reset/request", summary="Solicitar reset de contraseña")
async def request_password_reset(
    body: PasswordResetRequest,
) -> dict:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == body.email))
        user = result.scalar_one_or_none()

        # Generic response to avoid user enumeration
        if not user:
            return {"message": "Si el email existe, recibirás un link en los próximos minutos"}

        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.password_reset_expire_minutes)

        reset_token = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
            created_at=datetime.now(timezone.utc),
        )
        db.add(reset_token)
        await db.commit()

        reset_link = f"{settings.frontend_base_url}/reset-password/{raw_token}"
        await send_password_reset_email(email=user.email, reset_link=reset_link)

    return {"message": "Si el email existe, recibirás un link en los próximos minutos"}


@router.post("/password-reset/confirm", summary="Confirmar reset de contraseña")
async def confirm_password_reset(
    body: PasswordResetConfirm,
) -> dict:
    if len(body.new_password) < 8:
        raise HTTPException(status_code=422, detail="La contraseña debe tener al menos 8 caracteres")

    token_hash = hashlib.sha256(body.token.encode()).hexdigest()
    now = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(PasswordResetToken)
            .where(PasswordResetToken.token_hash == token_hash)
            .where(PasswordResetToken.expires_at > now)
            .where(PasswordResetToken.used_at.is_(None))
        )
        reset_token = result.scalar_one_or_none()

        if not reset_token:
            raise HTTPException(status_code=400, detail="Token inválido o expirado")

        user_result = await db.execute(select(User).where(User.id == reset_token.user_id))
        user = user_result.scalar_one()
        user.hashed_password = hash_password(body.new_password)

        reset_token.used_at = now
        await db.commit()

    return {"message": "Contraseña actualizada correctamente"}
