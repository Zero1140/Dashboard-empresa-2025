from app.models.schemas import (
    Chunk, Source, QueryRequest, QueryResponse,
    IngestResponse, StatusResponse
)


def test_chunk_requires_id_and_text():
    c = Chunk(
        id="lei-23-2007-artigo-1",
        lei="Lei 23/2007",
        artigo="Artigo 1.º",
        titulo="Objeto",
        data_publicacao="2007-07-04",
        url_fonte="https://dre.pt/test",
        texto="A presente lei regula...",
    )
    assert c.id == "lei-23-2007-artigo-1"
    assert c.texto == "A presente lei regula..."


def test_query_response_has_sources():
    source = Source(
        lei="Lei 23/2007",
        artigo="Artigo 88.º",
        titulo="Autorização de residência",
        url="https://dre.pt/test",
        score=0.92,
    )
    resp = QueryResponse(answer="Segundo...", sources=[source])
    assert len(resp.sources) == 1
    assert resp.sources[0].score == 0.92


def test_ingest_response():
    r = IngestResponse(status="ok", chunks_added=42)
    assert r.chunks_added == 42


def test_status_response():
    r = StatusResponse(total_chunks=100, last_ingestion="2026-04-13T10:00:00")
    assert r.total_chunks == 100
