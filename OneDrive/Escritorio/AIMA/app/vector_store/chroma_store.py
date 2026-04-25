import chromadb
from chromadb.config import Settings as ChromaSettings
from app.models.schemas import Chunk
from app.config import settings as app_settings


class ChromaStore:
    COLLECTION_NAME = "aima_legislation"

    def __init__(self, path: str | None = None):
        resolved_path = path or str(app_settings.chroma_path.resolve())
        self._client = chromadb.PersistentClient(
            path=resolved_path,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        self._collection = self._client.get_or_create_collection(
            name=self.COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )

    def upsert_chunks(self, chunks: list[Chunk], embeddings: list[list[float]]) -> None:
        if not chunks:
            return
        self._collection.upsert(
            ids=[c.id for c in chunks],
            embeddings=embeddings,
            documents=[c.texto for c in chunks],
            metadatas=[
                {
                    "lei": c.lei,
                    "artigo": c.artigo,
                    "titulo": c.titulo or "",
                    "data_publicacao": c.data_publicacao or "",
                    "url_fonte": c.url_fonte,
                }
                for c in chunks
            ],
        )

    def search(self, query_embedding: list[float], top_k: int) -> list[dict]:
        n = self.count()
        if n == 0:
            return []
        results = self._collection.query(
            query_embeddings=[query_embedding],
            n_results=min(top_k, n),
            include=["documents", "metadatas", "distances"],
        )
        output = []
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            output.append(
                {
                    "texto": doc,
                    "lei": meta["lei"],
                    "artigo": meta["artigo"],
                    "titulo": meta.get("titulo", ""),
                    "url": meta["url_fonte"],
                    "score": round(1 - dist, 4),  # cosine: distance → similarity
                }
            )
        return output

    def count(self) -> int:
        return self._collection.count()

    def clear(self) -> None:
        self._client.delete_collection(self.COLLECTION_NAME)
        self._collection = self._client.get_or_create_collection(
            name=self.COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
