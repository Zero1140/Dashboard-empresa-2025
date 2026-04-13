import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client():
    with (
        patch("app.api.routes.IngestionPipeline"),
        patch("app.api.routes.HybridSearcher"),
        patch("app.api.routes.DeepSeekClient"),
    ):
        from app.main import app
        with TestClient(app, raise_server_exceptions=True) as c:
            yield c


def test_status_endpoint(client):
    response = client.get("/status")
    assert response.status_code == 200
    data = response.json()
    assert "total_chunks" in data


def test_query_returns_answer_and_sources(client):
    mock_sources = [
        {"lei": "Lei 23/2007", "artigo": "Artigo 80.º", "titulo": "Residência", "url": "https://dre.pt/1", "score": 0.9}
    ]
    mock_texts = ["Artigo 80.º — 5 anos de residência legal."]

    with (
        patch("app.api.routes.searcher") as mock_searcher,
        patch("app.api.routes.deepseek") as mock_deepseek,
    ):
        from app.models.schemas import Source
        mock_searcher.search.return_value = (
            [Source(**mock_sources[0])],
            mock_texts,
        )
        mock_deepseek.generate_answer.return_value = "Segundo o Artigo 80.º da Lei 23/2007..."

        response = client.post("/query", json={"question": "Quantos anos para residência permanente?"})
        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
        assert "sources" in data
        assert len(data["sources"]) == 1


def test_query_empty_question_returns_422(client):
    response = client.post("/query", json={"question": ""})
    assert response.status_code == 422


def test_ingest_endpoint_triggers_pipeline(client):
    with patch("app.api.routes.pipeline") as mock_pipeline:
        mock_pipeline.run.return_value = {"status": "ok", "chunks_added": 10}
        response = client.post("/ingest", json={"force": False})
        assert response.status_code == 200
        data = response.json()
        assert data["chunks_added"] == 10
