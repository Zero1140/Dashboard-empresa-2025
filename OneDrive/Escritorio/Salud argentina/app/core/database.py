import uuid as _uuid
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

engine = create_async_engine(
    settings.database_url,
    echo=settings.app_env == "development",
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


@asynccontextmanager
async def get_tenant_db(tenant_id: str) -> AsyncGenerator[AsyncSession, None]:
    """
    Session con row-level security activada para el tenant dado.
    Usar en todos los endpoints que acceden a datos de un tenant.
    """
    try:
        _uuid.UUID(tenant_id)  # raises ValueError if not a valid UUID
    except ValueError:
        raise ValueError(f"tenant_id inválido: {tenant_id}")

    async with AsyncSessionLocal() as session:
        # SET LOCAL doesn't support parameterized values in PostgreSQL;
        # tenant_id is validated as a UUID above before interpolation.
        await session.execute(
            text(f"SET LOCAL app.current_tenant_id = '{tenant_id}'")
        )
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
