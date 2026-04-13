from sentence_transformers import SentenceTransformer
from app.config import settings


class Embedder:
    _instance: "Embedder | None" = None
    _model: SentenceTransformer | None = None

    def __new__(cls) -> "Embedder":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._model = SentenceTransformer(settings.embedding_model)
        return cls._instance

    def embed_query(self, text: str) -> list[float]:
        """Embed a user query. e5 requires 'query: ' prefix."""
        prefixed = f"query: {text}"
        vector = self._model.encode(prefixed, normalize_embeddings=True)
        return vector.tolist()

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """Embed document passages. e5 requires 'passage: ' prefix."""
        prefixed = [f"passage: {t}" for t in texts]
        vectors = self._model.encode(prefixed, normalize_embeddings=True, batch_size=32)
        return [v.tolist() for v in vectors]
