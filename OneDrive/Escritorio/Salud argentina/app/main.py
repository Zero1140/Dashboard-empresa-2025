import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.redis import close_redis, get_redis

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    _log_startup_warnings()
    await get_redis()
    yield
    # Shutdown
    await close_redis()
    from app.connectors.registry import (  # noqa: PLC0415
        get_credential_connector,
        get_eligibility_connector,
        get_prescription_connector,
    )
    await get_credential_connector().close()
    await get_eligibility_connector().close()
    # get_prescription_connector shares the same FarmalinkConnector in real mode — skip double-close


def _log_startup_warnings() -> None:
    if settings.any_mock_active:
        mocks = ", ".join(settings.mock_connectors_list)
        logger.warning("=" * 70)
        logger.warning("⚠️  MODO MOCK ACTIVO — NO USAR EN PRODUCCIÓN")
        logger.warning(f"   Conectores en mock: {mocks}")
        logger.warning("   Ver PENDING_INTEGRATIONS.md para migrar a APIs reales.")
        logger.warning("=" * 70)

    if settings.is_production and settings.any_mock_active:
        raise RuntimeError(
            "CONFIGURACIÓN INVÁLIDA: conectores en mock con APP_ENV=production. "
            "Revisar PENDING_INTEGRATIONS.md y completar las credenciales reales."
        )


app = FastAPI(
    title="SaludOS Argentina",
    description="Infraestructura de salud digital B2B para el mercado argentino.",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.app_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.v1.router import router as v1_router  # noqa: E402

app.include_router(v1_router, prefix="/v1")
