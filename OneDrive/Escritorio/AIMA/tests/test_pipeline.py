import json
import pytest
from unittest.mock import patch
from app.ingestion.pipeline import IngestionPipeline


MOCK_DIPLOMAS = [
    {
        "id": "12345",
        "title": "Lei n.º 23/2007, de 4 de Julho",
        "type": "lei",
        "date": "2007-07-04",
        "url": "https://dre.pt/dr/detalhe/lei/23-2007-12345",
    }
]

MOCK_HTML = """
<html><body>
<h2>Artigo 80.º</h2>
<h3>Autorização de residência permanente</h3>
<p>Têm direito os cidadãos com 5 anos de residência legal.</p>
<h2>Artigo 81.º</h2>
<h3>Renovação</h3>
<p>A autorização permanente não está sujeita a renovação.</p>
</body></html>
"""


@pytest.fixture
def pipeline(tmp_path):
    return IngestionPipeline(
        raw_data_path=str(tmp_path / "raw"),
        log_path=str(tmp_path / "log.json"),
        chroma_path=str(tmp_path / "chroma"),
    )


def test_run_ingestion_adds_chunks(pipeline):
    with (
        patch.object(pipeline.scraper, "get_all_immigration_diplomas", return_value=MOCK_DIPLOMAS),
        patch.object(pipeline.scraper, "fetch_document_html", return_value=MOCK_HTML),
    ):
        result = pipeline.run(force=True)
        assert result["chunks_added"] >= 1
        assert result["status"] == "ok"


def test_run_ingestion_is_idempotent(pipeline):
    with (
        patch.object(pipeline.scraper, "get_all_immigration_diplomas", return_value=MOCK_DIPLOMAS),
        patch.object(pipeline.scraper, "fetch_document_html", return_value=MOCK_HTML),
    ):
        pipeline.run(force=True)
        result2 = pipeline.run(force=False)
        assert result2["chunks_added"] == 0


def test_log_is_written(pipeline, tmp_path):
    log_path = str(tmp_path / "log.json")
    with (
        patch.object(pipeline.scraper, "get_all_immigration_diplomas", return_value=MOCK_DIPLOMAS),
        patch.object(pipeline.scraper, "fetch_document_html", return_value=MOCK_HTML),
    ):
        pipeline.run(force=True)
    with open(log_path) as f:
        log = json.load(f)
    assert "last_ingestion" in log
    assert "total_chunks" in log
