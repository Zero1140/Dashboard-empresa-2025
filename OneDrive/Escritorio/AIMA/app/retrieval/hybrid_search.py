from rank_bm25 import BM25Okapi
from app.config import settings
from app.embeddings.embedder import Embedder
from app.models.schemas import Source
from app.vector_store.chroma_store import ChromaStore


class HybridSearcher:
    def __init__(
        self,
        top_k_final: int | None = None,
        store: ChromaStore | None = None,
        embedder: Embedder | None = None,
    ):
        self.top_k_final = top_k_final or settings.top_k_final
        self._store = store
        self._embedder = embedder

    @property
    def store(self) -> ChromaStore:
        if self._store is None:
            self._store = ChromaStore()
        return self._store

    @property
    def embedder(self) -> Embedder:
        if self._embedder is None:
            self._embedder = Embedder()
        return self._embedder

    def bm25_rerank(
        self,
        candidates: list[dict],
        query: str,
        top_k: int,
    ) -> list[Source]:
        """Re-rank candidates using BM25 on their texto field."""
        if not candidates:
            return []

        tokenized_corpus = [doc["texto"].lower().split() for doc in candidates]
        bm25 = BM25Okapi(tokenized_corpus)
        query_tokens = query.lower().split()
        bm25_scores = bm25.get_scores(query_tokens)

        # Combined score: 60% semantic + 40% BM25 (normalized)
        raw_max = max(bm25_scores)
        max_bm25 = raw_max if raw_max > 0 else 1.0
        scored = []
        for i, candidate in enumerate(candidates):
            bm25_norm = bm25_scores[i] / max_bm25
            combined = 0.6 * candidate["score"] + 0.4 * bm25_norm
            scored.append((combined, candidate))

        scored.sort(key=lambda x: x[0], reverse=True)
        top = scored[:top_k]

        return [
            Source(
                lei=c["lei"],
                artigo=c["artigo"],
                titulo=c.get("titulo") or "",
                url=c["url"],
                score=round(score, 4),
            )
            for score, c in top
        ]

    def search(self, query: str) -> tuple[list[Source], list[str]]:
        """
        Full hybrid search.
        Returns (sources, texts) where texts are for the LLM context.
        """
        query_embedding = self.embedder.embed_query(query)
        candidates = self.store.search(
            query_embedding=query_embedding,
            top_k=settings.top_k_semantic,
        )
        sources = self.bm25_rerank(
            candidates=candidates,
            query=query,
            top_k=self.top_k_final,
        )
        # Build texts in same order as ranked sources
        source_map = {(c["lei"], c["artigo"]): c["texto"] for c in candidates}
        texts = [
            source_map[(s.lei, s.artigo)]
            for s in sources
            if (s.lei, s.artigo) in source_map
        ]
        return sources, texts
