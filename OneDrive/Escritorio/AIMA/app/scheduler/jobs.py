import logging

from apscheduler.schedulers.background import BackgroundScheduler

from app.config import settings
from app.ingestion.pipeline import IngestionPipeline

logger = logging.getLogger(__name__)


def run_scheduled_ingestion() -> None:
    logger.info("[scheduler] Starting periodic ingestion...")
    pipeline = IngestionPipeline()
    result = pipeline.run(force=False)
    logger.info(f"[scheduler] Done. chunks_added={result['chunks_added']}")


def create_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        run_scheduled_ingestion,
        trigger="interval",
        days=settings.ingestion_interval_days,
        id="periodic_ingestion",
        replace_existing=True,
    )
    return scheduler
