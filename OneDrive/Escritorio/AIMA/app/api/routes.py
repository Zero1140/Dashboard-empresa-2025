import json
from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.config import settings
from app.generation.deepseek_client import DeepSeekClient
from app.ingestion.pipeline import IngestionPipeline
from app.models.schemas import (
    IngestResponse,
    QueryRequest,
    QueryResponse,
    StatusResponse,
)
from app.retrieval.hybrid_search import HybridSearcher

router = APIRouter()

# Singletons — initialized once at import time
pipeline = IngestionPipeline()
searcher = HybridSearcher()
deepseek = DeepSeekClient()


@router.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest) -> QueryResponse:
    if not request.question.strip():
        raise HTTPException(status_code=422, detail="Question cannot be empty")

    sources, texts = searcher.search(request.question)

    if not sources:
        return QueryResponse(
            answer="Esta informação não foi encontrada na legislação disponível.",
            sources=[],
        )

    answer = deepseek.generate_answer(
        question=request.question,
        texts=texts,
        sources=sources,
    )
    return QueryResponse(answer=answer, sources=sources)


@router.post("/ingest", response_model=IngestResponse)
async def ingest(body: dict) -> IngestResponse:
    force = body.get("force", False)
    result = pipeline.run(force=force)
    return IngestResponse(**result)


@router.get("/status", response_model=StatusResponse)
async def status() -> StatusResponse:
    total = searcher.store.count()
    log_path = Path(settings.ingestion_log_path)
    last_ingestion = None
    if log_path.exists():
        with open(log_path) as f:
            log = json.load(f)
        last_ingestion = log.get("last_ingestion")
    return StatusResponse(total_chunks=total, last_ingestion=last_ingestion)
