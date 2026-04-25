import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api.routes import router
from app.ingestion.pipeline import IngestionPipeline
from app.scheduler.jobs import create_scheduler
from app.vector_store.chroma_store import ChromaStore

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: run initial ingestion if DB is empty
    store = ChromaStore()
    if store.count() == 0:
        logger.info("[startup] Chroma is empty — running initial ingestion...")
        pipeline = IngestionPipeline()
        result = pipeline.run(force=True)
        logger.info(f"[startup] Initial ingestion done. chunks_added={result['chunks_added']}")

    # Start periodic scheduler
    scheduler = create_scheduler()
    scheduler.start()
    from app.config import settings
    logger.info(f"[startup] Scheduler started — re-ingestion every {settings.ingestion_interval_days} days")

    yield  # app runs here

    # Shutdown
    scheduler.shutdown(wait=False)
    logger.info("[shutdown] Scheduler stopped")


app = FastAPI(title="AIMA Legal Assistant", version="1.0.0", lifespan=lifespan)
app.include_router(router)

ui_path = Path(__file__).parent.parent / "ui"
if ui_path.exists():
    app.mount("/ui", StaticFiles(directory=str(ui_path), html=True), name="ui")
