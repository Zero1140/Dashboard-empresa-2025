from app.embeddings.embedder import Embedder


def test_embed_query_returns_vector():
    embedder = Embedder()
    vector = embedder.embed_query("Como renovar autorização de residência?")
    assert isinstance(vector, list)
    assert len(vector) == 1024  # e5-large dimension
    assert isinstance(vector[0], float)


def test_embed_documents_returns_list_of_vectors():
    embedder = Embedder()
    texts = ["Artigo 1.º — A presente lei...", "Artigo 2.º — Para efeitos..."]
    vectors = embedder.embed_documents(texts)
    assert len(vectors) == 2
    assert len(vectors[0]) == 1024


def test_embed_query_adds_prefix():
    embedder = Embedder()
    v1 = embedder.embed_query("residência permanente")
    v2 = embedder.embed_query("visto de trabalho")
    assert v1 != v2
