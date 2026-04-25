from app.retrieval.hybrid_search import HybridSearcher
from app.models.schemas import Source


CANDIDATES = [
    {"texto": "Artigo 80.º — Autorização de residência permanente. Requer 5 anos.", "lei": "Lei 23/2007", "artigo": "Artigo 80.º", "titulo": "Residência permanente", "url": "https://dre.pt/1", "score": 0.85},
    {"texto": "Artigo 88.º — Autorização de residência para exercício de atividade profissional.", "lei": "Lei 23/2007", "artigo": "Artigo 88.º", "titulo": "Atividade profissional", "url": "https://dre.pt/2", "score": 0.75},
    {"texto": "Artigo 77.º — Reagrupamento familiar.", "lei": "Lei 23/2007", "artigo": "Artigo 77.º", "titulo": "Reagrupamento", "url": "https://dre.pt/3", "score": 0.70},
]


def test_rerank_returns_top_k():
    searcher = HybridSearcher(top_k_final=2)
    results = searcher.bm25_rerank(
        candidates=CANDIDATES,
        query="residência permanente 5 anos",
        top_k=2,
    )
    assert len(results) == 2


def test_rerank_promotes_exact_match():
    searcher = HybridSearcher(top_k_final=3)
    results = searcher.bm25_rerank(
        candidates=CANDIDATES,
        query="atividade profissional autorização",
        top_k=3,
    )
    artigos = [r.artigo for r in results]
    assert artigos.index("Artigo 88.º") < artigos.index("Artigo 77.º")


def test_results_are_source_objects():
    searcher = HybridSearcher(top_k_final=3)
    results = searcher.bm25_rerank(
        candidates=CANDIDATES,
        query="residência",
        top_k=3,
    )
    assert all(isinstance(r, Source) for r in results)
