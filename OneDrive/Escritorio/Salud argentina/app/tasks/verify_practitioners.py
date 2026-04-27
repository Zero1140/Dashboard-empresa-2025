# app/tasks/verify_practitioners.py
"""
Re-verifica matrículas de todos los practitioners activos contra REFEPS.
Corre semanalmente via Celery beat.
"""
import asyncio
import logging
from datetime import datetime, timezone

from app.tasks import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.verify_practitioners.verify_all_active")
def verify_all_active() -> dict:
    """Entry point sincrónico para Celery. Delega al runner async."""
    return asyncio.run(_verify_all_async())


async def _verify_all_async() -> dict:
    from sqlalchemy import select
    from app.models.practitioner import Practitioner
    from app.connectors.registry import get_credential_connector

    connector = get_credential_connector()
    updated = 0
    errors = 0

    # Import async_session_maker — si no existe, usar AsyncSessionLocal
    try:
        from app.core.database import AsyncSessionLocal
    except ImportError:
        logger.error("No se encontró AsyncSessionLocal en app.core.database")
        return {"updated": 0, "errors": 0}

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Practitioner).where(Practitioner.aprobado.is_(True))
        )
        practitioners = list(result.scalars().all())

    for p in practitioners:
        try:
            v = await connector.verify_matricula(dni=p.dni)
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(Practitioner).where(Practitioner.id == p.id)
                )
                practitioner = result.scalar_one_or_none()
                if practitioner and v.found:
                    practitioner.estado_matricula = v.estado_matricula
                    practitioner.provincias_habilitadas = v.provincias_habilitadas
                    practitioner.fuente_verificacion = v.fuente
                    practitioner.refeps_verificado_en = datetime.now(tz=timezone.utc)
                    db.add(practitioner)
                    await db.commit()
            updated += 1
        except Exception as exc:
            logger.error("Error verificando practitioner %s: %s", p.id, exc)
            errors += 1

    logger.info(
        "Verificación periódica REFEPS completada: %d actualizados, %d errores",
        updated,
        errors,
    )
    return {"updated": updated, "errors": errors}
