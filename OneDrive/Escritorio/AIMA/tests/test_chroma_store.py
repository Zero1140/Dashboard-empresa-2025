import pytest
from app.vector_store.chroma_store import ChromaStore
from app.models.schemas import Chunk


@pytest.fixture
def store(tmp_path):
    return ChromaStore(path=str(tmp_path / "chroma_test"))


def make_chunk(id: str, texto: str) -> Chunk:
    return Chunk(
        id=id,
        lei="Lei 23/2007",
        artigo="Artigo 1.º",
        titulo="Test",
        data_publicacao="2007-07-04",
        url_fonte="https://dre.pt/test",
        texto=texto,
    )


def test_upsert_and_count(store):
    chunks = [
        make_chunk("chunk-1", "A presente lei regula as condições de entrada."),
        make_chunk("chunk-2", "O estrangeiro deve apresentar passaporte válido."),
    ]
    embeddings = [[0.1] * 1024, [0.2] * 1024]
    store.upsert_chunks(chunks, embeddings)
    assert store.count() == 2


def test_upsert_is_idempotent(store):
    chunk = make_chunk("chunk-1", "Texto qualquer.")
    store.upsert_chunks([chunk], [[0.1] * 1024])
    store.upsert_chunks([chunk], [[0.1] * 1024])  # same ID
    assert store.count() == 1


def test_search_returns_results(store):
    chunks = [
        make_chunk("chunk-1", "Autorização de residência permanente requer 5 anos."),
        make_chunk("chunk-2", "Visto de trabalho temporário válido por 1 ano."),
    ]
    embeddings = [[0.1] * 1024, [0.9] * 1024]
    store.upsert_chunks(chunks, embeddings)
    results = store.search(query_embedding=[0.1] * 1024, top_k=2)
    assert len(results) > 0
    assert "texto" in results[0]
    assert "lei" in results[0]


def test_clear_removes_all(store):
    chunk = make_chunk("chunk-1", "Texto.")
    store.upsert_chunks([chunk], [[0.1] * 1024])
    store.clear()
    assert store.count() == 0
