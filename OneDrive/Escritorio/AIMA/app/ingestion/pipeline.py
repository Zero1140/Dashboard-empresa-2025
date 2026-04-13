import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from app.config import settings as app_settings
from app.embeddings.embedder import Embedder
from app.ingestion.parser import clean_html, split_into_article_chunks
from app.ingestion.scraper import DREScraper
from app.vector_store.chroma_store import ChromaStore

logger = logging.getLogger(__name__)


class IngestionPipeline:
    def __init__(
        self,
        raw_data_path: str | None = None,
        log_path: str | None = None,
        chroma_path: str | None = None,
    ):
        self.raw_data_path = Path(raw_data_path or str(app_settings.raw_data_path.resolve()))
        self.log_path = Path(log_path or str(app_settings.ingestion_log_path.resolve()))
        self.raw_data_path.mkdir(parents=True, exist_ok=True)

        self.scraper = DREScraper()
        self.embedder = Embedder()
        self.store = ChromaStore(path=chroma_path)

    def _load_log(self) -> dict:
        if self.log_path.exists():
            with open(self.log_path) as f:
                return json.load(f)
        return {"last_ingestion": None, "total_chunks": 0, "ingested_ids": []}

    def _save_log(self, log: dict) -> None:
        self.log_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.log_path, "w") as f:
            json.dump(log, f, indent=2, ensure_ascii=False)

    def run(self, force: bool = False) -> dict:
        log = self._load_log()
        after_date = None if force else log.get("last_ingestion")
        if force:
            log["ingested_ids"] = []

        diplomas = self.scraper.get_all_immigration_diplomas(after_date=after_date)
        chunks_added = 0

        for diploma in diplomas:
            doc_id = str(diploma.get("id", ""))
            if doc_id in log.get("ingested_ids", []) and not force:
                continue

            try:
                html = self.scraper.fetch_document_html(diploma["url"])
                text = clean_html(html)
                lei_name = self.scraper.extract_lei_name(diploma.get("title", ""))
                chunks = split_into_article_chunks(
                    text=text,
                    lei=lei_name,
                    data_publicacao=diploma.get("date", ""),
                    url_fonte=diploma["url"],
                )
                if not chunks:
                    continue

                raw_file = self.raw_data_path / f"{doc_id}.json"
                with open(raw_file, "w", encoding="utf-8") as f:
                    json.dump(
                        {"diploma": diploma, "chunks": [c.model_dump() for c in chunks]},
                        f, indent=2, ensure_ascii=False,
                    )

                embeddings = self.embedder.embed_documents([c.texto for c in chunks])
                self.store.upsert_chunks(chunks, embeddings)
                chunks_added += len(chunks)
                log.setdefault("ingested_ids", []).append(doc_id)
                logger.info("Ingested diploma %s: %d chunks", doc_id, len(chunks))

            except Exception as e:
                logger.warning("Error processing diploma %s: %s", doc_id, e)
                continue

        log["last_ingestion"] = datetime.now(timezone.utc).isoformat()
        log["total_chunks"] = self.store.count()
        self._save_log(log)

        return {"status": "ok", "chunks_added": chunks_added}
