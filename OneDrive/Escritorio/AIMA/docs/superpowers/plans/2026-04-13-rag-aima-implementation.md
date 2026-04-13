# RAG AIMA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local RAG system that answers Portuguese immigration law questions using DeepSeek API + local embeddings + Chroma, grounded strictly in scraped Diário da República documents.

**Architecture:** FastAPI backend with APScheduler for periodic re-ingestion from dre.pt, multilingual-e5-large for local embeddings, Chroma as disk-persistent vector store, hybrid search (semantic + BM25 re-ranking), and a plain HTML/JS chat UI served as static files.

**Tech Stack:** Python 3.10+, FastAPI, Chroma, sentence-transformers (intfloat/multilingual-e5-large), rank-bm25, DeepSeek API (openai-compatible), APScheduler, BeautifulSoup4, HTML/CSS/JS

---

## File Map

| File | Responsibility |
|---|---|
| `requirements.txt` | All Python dependencies pinned |
| `.env.example` | Template for environment variables |
| `app/config.py` | Load .env, expose typed Settings object |
| `app/models/schemas.py` | All Pydantic models: QueryRequest, QueryResponse, Source, IngestResponse, StatusResponse, Chunk |
| `app/embeddings/embedder.py` | Wrapper for multilingual-e5-large: embed_query(), embed_documents() |
| `app/vector_store/chroma_store.py` | Chroma CRUD: upsert_chunks(), search(), count(), clear() |
| `app/ingestion/parser.py` | Clean HTML → plain text, split into article chunks |
| `app/ingestion/scraper.py` | dre.pt REST API: search_diplomas(), fetch_document_text() |
| `app/ingestion/pipeline.py` | Orchestrate: scrape → parse → embed → upsert, write ingestion_log.json |
| `app/retrieval/hybrid_search.py` | semantic top-20 via Chroma + BM25 re-rank → top-5 |
| `app/generation/prompt_builder.py` | Build system prompt + user message with context chunks |
| `app/generation/deepseek_client.py` | Call DeepSeek API, return answer string |
| `app/api/routes.py` | FastAPI router: POST /query, POST /ingest, GET /status |
| `app/scheduler/jobs.py` | APScheduler setup, run_ingestion job |
| `app/main.py` | FastAPI app init, include router, mount /ui static, start scheduler |
| `ui/index.html` | Chat interface HTML |
| `ui/app.js` | Fetch /query, render messages and sources |
| `ui/style.css` | Minimal dark theme styling |
| `tests/test_parser.py` | Unit tests for HTML cleaning and chunk splitting |
| `tests/test_hybrid_search.py` | Unit tests for BM25 re-ranking logic |
| `tests/test_prompt_builder.py` | Unit tests for prompt construction |
| `tests/test_routes.py` | Integration tests for API endpoints (mocked retrieval) |

---

## Task 1: Project Setup — requirements.txt, .env, config.py, directories

**Files:**
- Create: `requirements.txt`
- Create: `.env.example`
- Create: `.env`
- Create: `app/__init__.py`
- Create: `app/config.py`
- Create: `tests/__init__.py`

- [ ] **Step 1: Create directory structure**

```bash
cd /c/Users/guill/OneDrive/Escritorio/AIMA
mkdir -p app/ingestion app/embeddings app/vector_store app/retrieval \
         app/generation app/api app/scheduler app/models \
         data/raw data/chroma_db ui tests
touch app/__init__.py app/ingestion/__init__.py app/embeddings/__init__.py \
      app/vector_store/__init__.py app/retrieval/__init__.py \
      app/generation/__init__.py app/api/__init__.py \
      app/scheduler/__init__.py app/models/__init__.py \
      tests/__init__.py
```

- [ ] **Step 2: Create requirements.txt**

```
fastapi==0.115.5
uvicorn[standard]==0.32.1
chromadb==0.5.23
sentence-transformers==3.3.1
rank-bm25==0.2.2
beautifulsoup4==4.12.3
requests==2.32.3
apscheduler==3.10.4
python-dotenv==1.0.1
openai==1.57.0
pydantic==2.10.3
pydantic-settings==2.6.1
pytest==8.3.4
httpx==0.28.1
pytest-asyncio==0.24.0
lxml==5.3.0
```

- [ ] **Step 3: Create .env.example**

```env
DEEPSEEK_API_KEY=sk-your-key-here
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_BASE_URL=https://api.deepseek.com
EMBEDDING_MODEL=intfloat/multilingual-e5-large
CHROMA_PATH=./data/chroma_db
RAW_DATA_PATH=./data/raw
INGESTION_LOG_PATH=./data/ingestion_log.json
INGESTION_INTERVAL_DAYS=7
TOP_K_SEMANTIC=20
TOP_K_FINAL=5
```

- [ ] **Step 4: Create .env** (copy .env.example and fill your key)

```bash
cp .env.example .env
# Edit .env and set DEEPSEEK_API_KEY=sk-YOUR_ACTUAL_KEY
```

- [ ] **Step 5: Create app/config.py**

```python
from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    deepseek_api_key: str
    deepseek_model: str = "deepseek-chat"
    deepseek_base_url: str = "https://api.deepseek.com"
    embedding_model: str = "intfloat/multilingual-e5-large"
    chroma_path: str = "./data/chroma_db"
    raw_data_path: str = "./data/raw"
    ingestion_log_path: str = "./data/ingestion_log.json"
    ingestion_interval_days: int = 7
    top_k_semantic: int = 20
    top_k_final: int = 5

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    def chroma_path_resolved(self) -> Path:
        return Path(self.chroma_path).resolve()

    def raw_data_path_resolved(self) -> Path:
        return Path(self.raw_data_path).resolve()


settings = Settings()
```

- [ ] **Step 6: Install dependencies**

```bash
pip install -r requirements.txt
```

Expected: all packages install without errors.

- [ ] **Step 7: Verify config loads**

```bash
python -c "from app.config import settings; print(settings.deepseek_model)"
```

Expected output: `deepseek-chat`

- [ ] **Step 8: Commit**

```bash
git add requirements.txt .env.example app/config.py app/__init__.py \
        app/ingestion/__init__.py app/embeddings/__init__.py \
        app/vector_store/__init__.py app/retrieval/__init__.py \
        app/generation/__init__.py app/api/__init__.py \
        app/scheduler/__init__.py app/models/__init__.py tests/__init__.py
git commit -m "feat: project setup — config, deps, directory structure"
```

---

## Task 2: Pydantic Schemas

**Files:**
- Create: `app/models/schemas.py`
- Create: `tests/test_schemas.py`

- [ ] **Step 1: Write failing test**

Create `tests/test_schemas.py`:

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_schemas.py -v
```

Expected: `ImportError` — schemas module not found.

- [ ] **Step 3: Create app/models/schemas.py**

```python
from pydantic import BaseModel
from typing import Optional


class Chunk(BaseModel):
    id: str
    lei: str
    artigo: str
    titulo: Optional[str] = None
    data_publicacao: Optional[str] = None
    url_fonte: str
    texto: str


class Source(BaseModel):
    lei: str
    artigo: str
    titulo: Optional[str] = None
    url: str
    score: float


class QueryRequest(BaseModel):
    question: str


class QueryResponse(BaseModel):
    answer: str
    sources: list[Source]


class IngestResponse(BaseModel):
    status: str
    chunks_added: int


class StatusResponse(BaseModel):
    total_chunks: int
    last_ingestion: Optional[str] = None
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_schemas.py -v
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/models/schemas.py tests/test_schemas.py
git commit -m "feat: Pydantic schemas for all data models"
```

---

## Task 3: Embedder (multilingual-e5-large)

**Files:**
- Create: `app/embeddings/embedder.py`
- Create: `tests/test_embedder.py`

**Important:** multilingual-e5 requires prefix `"query: "` for queries and `"passage: "` for documents. Without this, retrieval quality degrades significantly.

- [ ] **Step 1: Write failing test**

Create `tests/test_embedder.py`:

```python
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
    # Two different queries should produce different vectors
    v1 = embedder.embed_query("residência permanente")
    v2 = embedder.embed_query("visto de trabalho")
    assert v1 != v2
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_embedder.py -v
```

Expected: `ImportError`.

- [ ] **Step 3: Create app/embeddings/embedder.py**

```python
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_embedder.py -v
```

Expected: 3 tests PASS. (First run downloads model cache if not present — already cached per setup.)

- [ ] **Step 5: Commit**

```bash
git add app/embeddings/embedder.py tests/test_embedder.py
git commit -m "feat: multilingual-e5-large embedder with query/passage prefixes"
```

---

## Task 4: Chroma Vector Store

**Files:**
- Create: `app/vector_store/chroma_store.py`
- Create: `tests/test_chroma_store.py`

- [ ] **Step 1: Write failing test**

Create `tests/test_chroma_store.py`:

```python
import pytest
import tempfile
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_chroma_store.py -v
```

Expected: `ImportError`.

- [ ] **Step 3: Create app/vector_store/chroma_store.py**

```python
import chromadb
from chromadb.config import Settings as ChromaSettings
from app.models.schemas import Chunk
from app.config import settings as app_settings


class ChromaStore:
    COLLECTION_NAME = "aima_legislation"

    def __init__(self, path: str | None = None):
        resolved_path = path or str(app_settings.chroma_path_resolved())
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
        if self.count() == 0:
            return []
        results = self._collection.query(
            query_embeddings=[query_embedding],
            n_results=min(top_k, self.count()),
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_chroma_store.py -v
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/vector_store/chroma_store.py tests/test_chroma_store.py
git commit -m "feat: Chroma vector store with upsert/search/count/clear"
```

---

## Task 5: Parser — HTML Cleaner + Article Chunker

**Files:**
- Create: `app/ingestion/parser.py`
- Create: `tests/test_parser.py`

- [ ] **Step 1: Write failing test**

Create `tests/test_parser.py`:

```python
from app.ingestion.parser import clean_html, split_into_article_chunks


SAMPLE_HTML = """
<html><body>
<h1>Lei n.º 23/2007, de 4 de julho</h1>
<p>Aprova o regime jurídico de entrada, permanência, saída e afastamento de estrangeiros.</p>
<article>
<h2>Artigo 80.º</h2>
<h3>Autorização de residência permanente</h3>
<p>Têm direito a autorização de residência permanente os cidadãos estrangeiros
que sejam titulares de autorização de residência temporária há pelo menos
5 anos e que reúnam os seguintes requisitos:</p>
<p>a) Meios de subsistência estáveis;</p>
<p>b) Alojamento;</p>
<p>c) Conhecimento do português.</p>
</article>
<article>
<h2>Artigo 81.º</h2>
<h3>Renovação</h3>
<p>A autorização de residência permanente não está sujeita a renovação.</p>
</article>
</body></html>
"""


def test_clean_html_removes_tags():
    text = clean_html(SAMPLE_HTML)
    assert "<html>" not in text
    assert "<p>" not in text
    assert "Artigo 80" in text
    assert "5 anos" in text


def test_split_returns_one_chunk_per_article():
    text = clean_html(SAMPLE_HTML)
    chunks = split_into_article_chunks(
        text=text,
        lei="Lei 23/2007",
        data_publicacao="2007-07-04",
        url_fonte="https://dre.pt/test",
    )
    assert len(chunks) >= 2
    artigos = [c.artigo for c in chunks]
    assert any("80" in a for a in artigos)
    assert any("81" in a for a in artigos)


def test_chunk_id_is_stable():
    text = clean_html(SAMPLE_HTML)
    chunks = split_into_article_chunks(
        text=text,
        lei="Lei 23/2007",
        data_publicacao="2007-07-04",
        url_fonte="https://dre.pt/test",
    )
    # Same law + artigo always produces same ID
    chunk_80 = next(c for c in chunks if "80" in c.artigo)
    assert chunk_80.id == "lei-23-2007-artigo-80"


def test_chunk_texto_not_empty():
    text = clean_html(SAMPLE_HTML)
    chunks = split_into_article_chunks(
        text=text,
        lei="Lei 23/2007",
        data_publicacao="2007-07-04",
        url_fonte="https://dre.pt/test",
    )
    for chunk in chunks:
        assert len(chunk.texto.strip()) > 10
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_parser.py -v
```

Expected: `ImportError`.

- [ ] **Step 3: Create app/ingestion/parser.py**

```python
import re
from bs4 import BeautifulSoup
from app.models.schemas import Chunk


def clean_html(html: str) -> str:
    """Strip HTML tags and normalize whitespace."""
    soup = BeautifulSoup(html, "lxml")
    # Remove scripts and styles
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()
    text = soup.get_text(separator="\n")
    # Collapse multiple blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _make_chunk_id(lei: str, artigo: str) -> str:
    """Stable ID: 'lei-23-2007-artigo-88'"""
    lei_slug = re.sub(r"[^a-z0-9]", "-", lei.lower())
    lei_slug = re.sub(r"-+", "-", lei_slug).strip("-")
    # Extract only the number from artigo
    artigo_num = re.search(r"\d+", artigo)
    num = artigo_num.group() if artigo_num else re.sub(r"[^a-z0-9]", "-", artigo.lower())
    return f"{lei_slug}-artigo-{num}"


def split_into_article_chunks(
    text: str,
    lei: str,
    data_publicacao: str,
    url_fonte: str,
) -> list[Chunk]:
    """
    Split cleaned legal text into one Chunk per Artigo.
    Matches patterns like: 'Artigo 80.º', 'Artigo 80', 'ARTIGO 80'
    """
    # Pattern matches start of each article
    pattern = re.compile(
        r"(Artigo\s+\d+\.?[°º]?\s*[A-Z]?\.?\s*[-–]?\s*\n)",
        re.IGNORECASE,
    )
    # Split text at each article boundary
    parts = pattern.split(text)
    chunks: list[Chunk] = []

    i = 1  # parts[0] is preamble before first article
    while i < len(parts) - 1:
        artigo_header = parts[i].strip()
        artigo_body = parts[i + 1] if i + 1 < len(parts) else ""
        # Extract article number from header
        num_match = re.search(r"\d+", artigo_header)
        artigo_num = num_match.group() if num_match else artigo_header

        # Try to get title from first non-empty line of body
        body_lines = [l.strip() for l in artigo_body.split("\n") if l.strip()]
        titulo = body_lines[0] if body_lines else None
        # If titulo looks like a new article, skip it
        if titulo and re.match(r"Artigo\s+\d+", titulo, re.IGNORECASE):
            titulo = None

        full_text = f"{artigo_header}\n{artigo_body}".strip()
        if len(full_text) < 20:
            i += 2
            continue

        artigo_label = f"Artigo {artigo_num}.º"
        chunk = Chunk(
            id=_make_chunk_id(lei, artigo_label),
            lei=lei,
            artigo=artigo_label,
            titulo=titulo,
            data_publicacao=data_publicacao,
            url_fonte=url_fonte,
            texto=full_text[:2000],  # cap at ~1000 tokens
        )
        chunks.append(chunk)
        i += 2

    return chunks
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_parser.py -v
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/ingestion/parser.py tests/test_parser.py
git commit -m "feat: HTML cleaner and article chunk splitter"
```

---

## Task 6: dre.pt Scraper

**Files:**
- Create: `app/ingestion/scraper.py`
- Create: `tests/test_scraper.py`

**Note:** dre.pt's API endpoint is `https://dre.pt/rest/api/dr/search`. If the endpoint changes, only this file needs updating.

- [ ] **Step 1: Write failing test**

Create `tests/test_scraper.py`:

```python
from unittest.mock import patch, MagicMock
from app.ingestion.scraper import DREScraper


MOCK_SEARCH_RESPONSE = {
    "results": [
        {
            "id": "12345",
            "title": "Lei n.º 23/2007, de 4 de Julho",
            "type": "lei",
            "date": "2007-07-04",
            "url": "https://dre.pt/dr/detalhe/lei/23-2007-12345",
        }
    ],
    "total": 1,
}

MOCK_HTML = "<html><body><div class='diploma-text'><p>Artigo 1.º\nObjeto</p></div></body></html>"


def test_search_diplomas_returns_list():
    scraper = DREScraper()
    with patch("requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.json.return_value = MOCK_SEARCH_RESPONSE
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp

        results = scraper.search_diplomas(keyword="estrangeiros", after_date="2007-01-01")
        assert len(results) == 1
        assert results[0]["title"] == "Lei n.º 23/2007, de 4 de Julho"


def test_fetch_document_returns_html():
    scraper = DREScraper()
    with patch("requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.text = MOCK_HTML
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp

        html = scraper.fetch_document_html("https://dre.pt/dr/detalhe/lei/23-2007-12345")
        assert "<html>" in html
        assert "Artigo 1" in html


def test_extract_lei_name_from_title():
    scraper = DREScraper()
    name = scraper.extract_lei_name("Lei n.º 23/2007, de 4 de Julho")
    assert name == "Lei 23/2007"


def test_extract_lei_name_decreto():
    scraper = DREScraper()
    name = scraper.extract_lei_name("Decreto-Lei n.º 84/2007, de 29 de março")
    assert name == "Decreto-Lei 84/2007"
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_scraper.py -v
```

Expected: `ImportError`.

- [ ] **Step 3: Create app/ingestion/scraper.py**

```python
import re
import time
import requests
from typing import Any


class DREScraper:
    BASE_URL = "https://dre.pt/rest/api"
    SEARCH_URL = f"{BASE_URL}/dr/search"
    HEADERS = {
        "Accept": "application/json",
        "User-Agent": "AIMA-RAG/1.0 (legal research tool)",
    }
    # Keywords covering immigration domain
    IMMIGRATION_KEYWORDS = [
        "estrangeiros",
        "imigração",
        "autorização de residência",
        "AIMA",
        "SEF",
        "visto",
        "nacionalidade portuguesa",
        "manifestação de interesse",
        "reagrupamento familiar",
    ]
    DIPLOMA_TYPES = ["lei", "decreto-lei", "portaria", "despacho"]

    def search_diplomas(
        self,
        keyword: str,
        after_date: str | None = None,
        rows: int = 25,
    ) -> list[dict[str, Any]]:
        """
        Search dre.pt for diplomas matching keyword.
        after_date format: 'YYYY-MM-DD'
        Returns list of {id, title, type, date, url}.
        """
        params: dict[str, Any] = {
            "q": keyword,
            "rows": rows,
            "start": 0,
        }
        if after_date:
            params["fromDate"] = after_date

        all_results: list[dict] = []
        start = 0
        while True:
            params["start"] = start
            resp = requests.get(
                self.SEARCH_URL,
                params=params,
                headers=self.HEADERS,
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()
            results = data.get("results", [])
            if not results:
                break
            all_results.extend(results)
            if len(all_results) >= data.get("total", 0):
                break
            start += rows
            time.sleep(0.5)  # be polite to dre.pt

        return all_results

    def fetch_document_html(self, url: str) -> str:
        """Fetch full HTML of a diploma page."""
        resp = requests.get(url, headers=self.HEADERS, timeout=30)
        resp.raise_for_status()
        return resp.text

    def extract_lei_name(self, title: str) -> str:
        """
        Convert raw title to normalized lei name.
        'Lei n.º 23/2007, de 4 de Julho' → 'Lei 23/2007'
        'Decreto-Lei n.º 84/2007, ...' → 'Decreto-Lei 84/2007'
        """
        # Match diploma type + number
        match = re.match(
            r"(Lei|Decreto-Lei|Portaria|Despacho)[^\d]*(\d+/\d+)",
            title,
            re.IGNORECASE,
        )
        if match:
            tipo = match.group(1).title()
            numero = match.group(2)
            return f"{tipo} {numero}"
        # Fallback: return first 60 chars
        return title[:60].strip()

    def get_all_immigration_diplomas(self, after_date: str | None = None) -> list[dict]:
        """Fetch diplomas for all immigration keywords, deduplicated by id."""
        seen: set[str] = set()
        all_diplomas: list[dict] = []
        for keyword in self.IMMIGRATION_KEYWORDS:
            results = self.search_diplomas(keyword=keyword, after_date=after_date)
            for r in results:
                doc_id = str(r.get("id", ""))
                if doc_id and doc_id not in seen:
                    seen.add(doc_id)
                    all_diplomas.append(r)
            time.sleep(1)  # rate limit between keywords
        return all_diplomas
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_scraper.py -v
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/ingestion/scraper.py tests/test_scraper.py
git commit -m "feat: dre.pt scraper with keyword search and HTML fetcher"
```

---

## Task 7: Ingestion Pipeline

**Files:**
- Create: `app/ingestion/pipeline.py`
- Create: `tests/test_pipeline.py`

- [ ] **Step 1: Write failing test**

Create `tests/test_pipeline.py`:

```python
import json
import pytest
from unittest.mock import patch, MagicMock
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


def test_run_ingestion_adds_chunks(pipeline, tmp_path):
    with (
        patch.object(pipeline.scraper, "get_all_immigration_diplomas", return_value=MOCK_DIPLOMAS),
        patch.object(pipeline.scraper, "fetch_document_html", return_value=MOCK_HTML),
    ):
        result = pipeline.run(force=True)
        assert result["chunks_added"] >= 2
        assert result["status"] == "ok"


def test_run_ingestion_is_idempotent(pipeline, tmp_path):
    with (
        patch.object(pipeline.scraper, "get_all_immigration_diplomas", return_value=MOCK_DIPLOMAS),
        patch.object(pipeline.scraper, "fetch_document_html", return_value=MOCK_HTML),
    ):
        result1 = pipeline.run(force=True)
        result2 = pipeline.run(force=False)
        # Second run: same diplomas already stored, 0 new chunks
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_pipeline.py -v
```

Expected: `ImportError`.

- [ ] **Step 3: Create app/ingestion/pipeline.py**

```python
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from app.config import settings as app_settings
from app.embeddings.embedder import Embedder
from app.ingestion.parser import clean_html, split_into_article_chunks
from app.ingestion.scraper import DREScraper
from app.vector_store.chroma_store import ChromaStore


class IngestionPipeline:
    def __init__(
        self,
        raw_data_path: str | None = None,
        log_path: str | None = None,
        chroma_path: str | None = None,
    ):
        self.raw_data_path = Path(raw_data_path or app_settings.raw_data_path_resolved())
        self.log_path = Path(log_path or app_settings.ingestion_log_path)
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

                # Save raw JSON
                raw_file = self.raw_data_path / f"{doc_id}.json"
                with open(raw_file, "w", encoding="utf-8") as f:
                    json.dump(
                        {"diploma": diploma, "chunks": [c.model_dump() for c in chunks]},
                        f, indent=2, ensure_ascii=False,
                    )

                # Embed and upsert
                embeddings = self.embedder.embed_documents([c.texto for c in chunks])
                self.store.upsert_chunks(chunks, embeddings)
                chunks_added += len(chunks)
                log.setdefault("ingested_ids", []).append(doc_id)

            except Exception as e:
                print(f"[pipeline] Error processing {doc_id}: {e}")
                continue

        log["last_ingestion"] = datetime.now(timezone.utc).isoformat()
        log["total_chunks"] = self.store.count()
        self._save_log(log)

        return {"status": "ok", "chunks_added": chunks_added}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_pipeline.py -v
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/ingestion/pipeline.py tests/test_pipeline.py
git commit -m "feat: ingestion pipeline — scrape, parse, embed, upsert with dedup log"
```

---

## Task 8: Hybrid Search (Semantic + BM25)

**Files:**
- Create: `app/retrieval/hybrid_search.py`
- Create: `tests/test_hybrid_search.py`

- [ ] **Step 1: Write failing test**

Create `tests/test_hybrid_search.py`:

```python
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
    # Artigo 88 (exact terms) should rank higher than Artigo 77
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_hybrid_search.py -v
```

Expected: `ImportError`.

- [ ] **Step 3: Create app/retrieval/hybrid_search.py**

```python
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

        # Combine: 60% semantic score + 40% BM25 score (normalized)
        max_bm25 = max(bm25_scores) if max(bm25_scores) > 0 else 1.0
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
        Returns (sources, texts) — texts are used for the prompt context.
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
        # Get full texts for the top sources (matched by lei+artigo)
        texts = []
        source_keys = {(s.lei, s.artigo) for s in sources}
        for c in candidates:
            if (c["lei"], c["artigo"]) in source_keys:
                texts.append(c["texto"])

        return sources, texts
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_hybrid_search.py -v
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/retrieval/hybrid_search.py tests/test_hybrid_search.py
git commit -m "feat: hybrid search — semantic top-20 + BM25 re-rank to top-5"
```

---

## Task 9: Prompt Builder + DeepSeek Client

**Files:**
- Create: `app/generation/prompt_builder.py`
- Create: `app/generation/deepseek_client.py`
- Create: `tests/test_prompt_builder.py`

- [ ] **Step 1: Write failing test**

Create `tests/test_prompt_builder.py`:

```python
from app.generation.prompt_builder import build_system_prompt, build_user_message
from app.models.schemas import Source


SOURCES = [
    Source(lei="Lei 23/2007", artigo="Artigo 80.º", titulo="Residência permanente", url="https://dre.pt/1", score=0.9),
]
TEXTS = ["Artigo 80.º — Têm direito os cidadãos com 5 anos de residência legal."]


def test_system_prompt_contains_rules():
    prompt = build_system_prompt()
    assert "ÚNICAMENTE" in prompt or "SOMENTE" in prompt or "estritamente" in prompt.lower()
    assert "não foi encontrada" in prompt


def test_user_message_contains_chunks():
    msg = build_user_message(
        question="Quantos anos para residência permanente?",
        texts=TEXTS,
        sources=SOURCES,
    )
    assert "Artigo 80" in msg
    assert "5 anos" in msg
    assert "Quantos anos" in msg


def test_user_message_with_no_chunks():
    msg = build_user_message(
        question="Qual é o prazo?",
        texts=[],
        sources=[],
    )
    assert "Qual é o prazo?" in msg
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_prompt_builder.py -v
```

Expected: `ImportError`.

- [ ] **Step 3: Create app/generation/prompt_builder.py**

```python
from app.models.schemas import Source

SYSTEM_PROMPT = """Você é um assistente jurídico especializado em legislação portuguesa de imigração e residência.

REGRAS ESTRITAS:
1. Responda ÚNICAMENTE com informação presente nos fragmentos legais fornecidos.
2. Se a resposta não estiver nos fragmentos → responda exatamente: "Esta informação não foi encontrada na legislação disponível."
3. Cite SEMPRE: nome da lei + número do artigo.
4. Responda no idioma da pergunta (português ou espanhol).
5. Não interprete nem opine — apenas informe o que diz a lei.
6. Se houver contradição entre artigos, mencione ambos e indique que requer interpretação jurídica profissional."""


def build_system_prompt() -> str:
    return SYSTEM_PROMPT


def build_user_message(
    question: str,
    texts: list[str],
    sources: list[Source],
) -> str:
    if not texts:
        return f"Pergunta: {question}"

    fragments = []
    for i, (text, source) in enumerate(zip(texts, sources), 1):
        fragments.append(
            f"[Fragmento {i} — {source.lei}, {source.artigo}]\n{text}"
        )

    context = "\n\n".join(fragments)
    return f"""Fragmentos legais relevantes:

{context}

---

Pergunta: {question}"""
```

- [ ] **Step 4: Create app/generation/deepseek_client.py**

```python
from openai import OpenAI
from app.config import settings
from app.generation.prompt_builder import build_system_prompt, build_user_message
from app.models.schemas import Source


class DeepSeekClient:
    def __init__(self):
        self._client = OpenAI(
            api_key=settings.deepseek_api_key,
            base_url=settings.deepseek_base_url,
        )

    def generate_answer(
        self,
        question: str,
        texts: list[str],
        sources: list[Source],
    ) -> str:
        """Call DeepSeek and return answer string."""
        response = self._client.chat.completions.create(
            model=settings.deepseek_model,
            messages=[
                {"role": "system", "content": build_system_prompt()},
                {"role": "user", "content": build_user_message(question, texts, sources)},
            ],
            temperature=0.1,  # low temperature for factual legal answers
            max_tokens=1024,
        )
        return response.choices[0].message.content.strip()
```

- [ ] **Step 5: Run prompt builder tests**

```bash
pytest tests/test_prompt_builder.py -v
```

Expected: 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add app/generation/prompt_builder.py app/generation/deepseek_client.py tests/test_prompt_builder.py
git commit -m "feat: prompt builder (strict mode) + DeepSeek API client"
```

---

## Task 10: FastAPI Routes

**Files:**
- Create: `app/api/routes.py`
- Create: `tests/test_routes.py`

- [ ] **Step 1: Write failing test**

Create `tests/test_routes.py`:

```python
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


def test_status_endpoint():
    response = client.get("/status")
    assert response.status_code == 200
    data = response.json()
    assert "total_chunks" in data


def test_query_returns_answer_and_sources():
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


def test_query_empty_question_returns_422():
    response = client.post("/query", json={"question": ""})
    assert response.status_code == 422


def test_ingest_endpoint_triggers_pipeline():
    with patch("app.api.routes.pipeline") as mock_pipeline:
        mock_pipeline.run.return_value = {"status": "ok", "chunks_added": 10}
        response = client.post("/ingest", json={"force": False})
        assert response.status_code == 200
        data = response.json()
        assert data["chunks_added"] == 10
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_routes.py -v
```

Expected: `ImportError` — app.main not found.

- [ ] **Step 3: Create app/api/routes.py**

```python
from fastapi import APIRouter, HTTPException
from app.ingestion.pipeline import IngestionPipeline
from app.retrieval.hybrid_search import HybridSearcher
from app.generation.deepseek_client import DeepSeekClient
from app.models.schemas import (
    QueryRequest, QueryResponse, IngestResponse, StatusResponse
)
import json
from pathlib import Path
from app.config import settings

router = APIRouter()

# Singletons — initialized once at import time
pipeline = IngestionPipeline()
searcher = HybridSearcher()
deepseek = DeepSeekClient()


@router.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest) -> QueryResponse:
    if not request.question.strip():
        raise HTTPException(status_code=422, detail="Question cannot be empty")

    sources, texts = searcher.search(request.question)

    if not sources:
        return QueryResponse(
            answer="Esta informação não foi encontrada na legislação disponível.",
            sources=[],
        )

    answer = deepseek.generate_answer(
        question=request.question,
        texts=texts,
        sources=sources,
    )
    return QueryResponse(answer=answer, sources=sources)


@router.post("/ingest", response_model=IngestResponse)
async def ingest(body: dict) -> IngestResponse:
    force = body.get("force", False)
    result = pipeline.run(force=force)
    return IngestResponse(**result)


@router.get("/status", response_model=StatusResponse)
async def status() -> StatusResponse:
    total = searcher.store.count()
    log_path = Path(settings.ingestion_log_path)
    last_ingestion = None
    if log_path.exists():
        with open(log_path) as f:
            log = json.load(f)
        last_ingestion = log.get("last_ingestion")
    return StatusResponse(total_chunks=total, last_ingestion=last_ingestion)
```

- [ ] **Step 4: Create app/main.py** (minimal, just enough for routes test)

```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.api.routes import router

app = FastAPI(title="AIMA Legal Assistant", version="1.0.0")
app.include_router(router)

# Serve UI as static files at /ui
ui_path = Path(__file__).parent.parent / "ui"
if ui_path.exists():
    app.mount("/ui", StaticFiles(directory=str(ui_path), html=True), name="ui")
```

- [ ] **Step 5: Run routes tests**

```bash
pytest tests/test_routes.py -v
```

Expected: 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add app/api/routes.py app/main.py tests/test_routes.py
git commit -m "feat: FastAPI routes /query /ingest /status"
```

---

## Task 11: Scheduler

**Files:**
- Modify: `app/main.py`
- Create: `app/scheduler/jobs.py`

- [ ] **Step 1: Create app/scheduler/jobs.py**

```python
from apscheduler.schedulers.background import BackgroundScheduler
from app.config import settings
from app.ingestion.pipeline import IngestionPipeline
from app.vector_store.chroma_store import ChromaStore
import logging

logger = logging.getLogger(__name__)


def run_scheduled_ingestion() -> None:
    logger.info("[scheduler] Starting periodic ingestion...")
    pipeline = IngestionPipeline()
    result = pipeline.run(force=False)
    logger.info(f"[scheduler] Done. chunks_added={result['chunks_added']}")


def create_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        run_scheduled_ingestion,
        trigger="interval",
        days=settings.ingestion_interval_days,
        id="periodic_ingestion",
        replace_existing=True,
    )
    return scheduler
```

- [ ] **Step 2: Update app/main.py to add startup/shutdown + initial ingestion**

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.api.routes import router
from app.scheduler.jobs import create_scheduler
from app.vector_store.chroma_store import ChromaStore
from app.ingestion.pipeline import IngestionPipeline
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: run initial ingestion if DB is empty
    store = ChromaStore()
    if store.count() == 0:
        logger.info("[startup] Chroma is empty — running initial ingestion...")
        pipeline = IngestionPipeline()
        result = pipeline.run(force=True)
        logger.info(f"[startup] Initial ingestion done. chunks_added={result['chunks_added']}")

    # Start periodic scheduler
    scheduler = create_scheduler()
    scheduler.start()
    logger.info(f"[startup] Scheduler started — re-ingestion every {__import__('app.config', fromlist=['settings']).settings.ingestion_interval_days} days")

    yield  # app runs here

    # Shutdown
    scheduler.shutdown(wait=False)
    logger.info("[shutdown] Scheduler stopped")


app = FastAPI(title="AIMA Legal Assistant", version="1.0.0", lifespan=lifespan)
app.include_router(router)

ui_path = Path(__file__).parent.parent / "ui"
if ui_path.exists():
    app.mount("/ui", StaticFiles(directory=str(ui_path), html=True), name="ui")
```

- [ ] **Step 3: Verify app still imports cleanly**

```bash
python -c "from app.main import app; print('app OK')"
```

Expected: `app OK`

- [ ] **Step 4: Commit**

```bash
git add app/scheduler/jobs.py app/main.py
git commit -m "feat: APScheduler for periodic re-ingestion + startup initial ingest"
```

---

## Task 12: Chat UI (HTML/JS/CSS)

**Files:**
- Create: `ui/index.html`
- Create: `ui/app.js`
- Create: `ui/style.css`

- [ ] **Step 1: Create ui/style.css**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Segoe UI', system-ui, sans-serif;
  background: #0f1117;
  color: #e2e8f0;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

header {
  padding: 1rem 1.5rem;
  background: #1a1f2e;
  border-bottom: 1px solid #2d3748;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

header h1 { font-size: 1.1rem; font-weight: 600; color: #90cdf4; }
header span { font-size: 0.75rem; color: #718096; }

#chat {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.msg { display: flex; flex-direction: column; max-width: 80%; }
.msg.user { align-self: flex-end; }
.msg.assistant { align-self: flex-start; }

.msg .bubble {
  padding: 0.75rem 1rem;
  border-radius: 12px;
  line-height: 1.6;
  font-size: 0.9rem;
  white-space: pre-wrap;
}

.msg.user .bubble { background: #2b6cb0; color: #fff; border-bottom-right-radius: 4px; }
.msg.assistant .bubble { background: #1a202c; border: 1px solid #2d3748; border-bottom-left-radius: 4px; }

.sources {
  margin-top: 0.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.source-chip {
  font-size: 0.7rem;
  background: #2d3748;
  border: 1px solid #4a5568;
  border-radius: 6px;
  padding: 0.2rem 0.5rem;
  color: #90cdf4;
  text-decoration: none;
  cursor: pointer;
}

.source-chip:hover { background: #4a5568; }

.thinking { color: #718096; font-style: italic; font-size: 0.85rem; }

#input-area {
  padding: 1rem 1.5rem;
  background: #1a1f2e;
  border-top: 1px solid #2d3748;
  display: flex;
  gap: 0.75rem;
}

#question {
  flex: 1;
  background: #0f1117;
  border: 1px solid #2d3748;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: #e2e8f0;
  font-size: 0.9rem;
  resize: none;
  outline: none;
}

#question:focus { border-color: #4299e1; }

#send-btn {
  background: #2b6cb0;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0 1.25rem;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: background 0.15s;
}

#send-btn:hover { background: #3182ce; }
#send-btn:disabled { background: #4a5568; cursor: not-allowed; }

.status-bar {
  font-size: 0.7rem;
  color: #4a5568;
  padding: 0.25rem 1.5rem;
  background: #0f1117;
  text-align: right;
}
```

- [ ] **Step 2: Create ui/app.js**

```javascript
const chat = document.getElementById('chat');
const questionEl = document.getElementById('question');
const sendBtn = document.getElementById('send-btn');
const statusBar = document.getElementById('status-bar');

async function fetchStatus() {
  try {
    const r = await fetch('/status');
    const d = await r.json();
    statusBar.textContent = `${d.total_chunks} fragmentos indexados${d.last_ingestion ? ' · última actualización: ' + new Date(d.last_ingestion).toLocaleDateString() : ''}`;
  } catch {}
}

function appendMessage(role, text, sources = []) {
  const msg = document.createElement('div');
  msg.className = `msg ${role}`;

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  msg.appendChild(bubble);

  if (sources.length > 0) {
    const sourcesEl = document.createElement('div');
    sourcesEl.className = 'sources';
    sources.forEach(s => {
      const chip = document.createElement('a');
      chip.className = 'source-chip';
      chip.href = s.url;
      chip.target = '_blank';
      chip.textContent = `${s.lei} · ${s.artigo}`;
      chip.title = s.titulo || '';
      sourcesEl.appendChild(chip);
    });
    msg.appendChild(sourcesEl);
  }

  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
  return msg;
}

function appendThinking() {
  const msg = document.createElement('div');
  msg.className = 'msg assistant';
  const bubble = document.createElement('div');
  bubble.className = 'bubble thinking';
  bubble.textContent = 'A consultar legislação...';
  msg.appendChild(bubble);
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
  return msg;
}

async function sendQuestion() {
  const question = questionEl.value.trim();
  if (!question) return;

  questionEl.value = '';
  sendBtn.disabled = true;
  appendMessage('user', question);
  const thinking = appendThinking();

  try {
    const response = await fetch('/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    const data = await response.json();
    thinking.remove();
    appendMessage('assistant', data.answer, data.sources || []);
  } catch (e) {
    thinking.remove();
    appendMessage('assistant', 'Erro ao contactar o servidor. Verifique se a aplicação está a correr.');
  } finally {
    sendBtn.disabled = false;
    questionEl.focus();
  }
}

sendBtn.addEventListener('click', sendQuestion);
questionEl.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendQuestion(); }
});

fetchStatus();
```

- [ ] **Step 3: Create ui/index.html**

```html
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AIMA — Assistente Legal</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <header>
    <div>
      <h1>AIMA — Assistente de Legislação</h1>
      <span>Imigração e Residência em Portugal · Diário da República</span>
    </div>
  </header>

  <div id="chat">
    <div class="msg assistant">
      <div class="bubble">
Olá! Sou o assistente jurídico especializado em legislação portuguesa de imigração e residência.

Pode perguntar-me sobre:
• Autorização de residência (temporária e permanente)
• Reagrupamento familiar
• Vistos e manifestações de interesse
• Requisitos e prazos legais

⚠️ As minhas respostas baseiam-se estritamente no texto legal do Diário da República. Para decisões importantes, consulte sempre um advogado.
      </div>
    </div>
  </div>

  <div class="status-bar" id="status-bar">A carregar...</div>

  <div id="input-area">
    <textarea
      id="question"
      placeholder="Faça a sua pergunta sobre legislação de imigração... (Enter para enviar)"
      rows="2"
    ></textarea>
    <button id="send-btn">Enviar</button>
  </div>

  <script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 4: Commit**

```bash
git add ui/index.html ui/app.js ui/style.css
git commit -m "feat: chat UI — dark theme, citations as clickable chips"
```

---

## Task 13: Full Run Test + README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Run all tests**

```bash
pytest tests/ -v
```

Expected: All tests PASS (test_schemas, test_embedder, test_chroma_store, test_parser, test_scraper, test_pipeline, test_hybrid_search, test_prompt_builder, test_routes).

- [ ] **Step 2: Start the app manually**

```bash
uvicorn app.main:app --reload --port 8000
```

Expected output:
```
INFO: [startup] Chroma is empty — running initial ingestion...
INFO: [startup] Scheduler started — re-ingestion every 7 days
INFO: Uvicorn running on http://127.0.0.1:8000
```

- [ ] **Step 3: Test /status endpoint**

```bash
curl http://localhost:8000/status
```

Expected: `{"total_chunks": N, "last_ingestion": "..."}`

- [ ] **Step 4: Open UI in browser**

Navigate to: `http://localhost:8000/ui`

Expected: Chat interface loads, status bar shows number of indexed fragments.

- [ ] **Step 5: Send a test query via curl**

```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"question": "Quantos anos são necessários para obter residência permanente?"}'
```

Expected: JSON with `answer` citing Lei 23/2007 Artigo 80.º and `sources` array.

- [ ] **Step 6: Create README.md**

```markdown
# AIMA — Assistente de Legislação Portuguesa de Imigração

Sistema RAG local para consulta de legislação portuguesa de imigração e residência.

## Requisitos

- Python 3.10+
- Chave de API DeepSeek

## Instalação

```bash
pip install -r requirements.txt
cp .env.example .env
# Editar .env e definir DEEPSEEK_API_KEY
```

## Iniciar

```bash
uvicorn app.main:app --reload --port 8000
```

Abrir: http://localhost:8000/ui

Na primeira execução, o sistema indexa automaticamente a legislação de imigração do Diário da República. A re-indexação ocorre a cada 7 dias.

## Endpoints

- `POST /query` — consulta legal
- `POST /ingest` — forçar re-indexação
- `GET /status` — estado do sistema

## Testes

```bash
pytest tests/ -v
```
```

- [ ] **Step 7: Final commit**

```bash
git add README.md
git commit -m "docs: README with setup and usage instructions"
```

---

## Self-Review

**Spec coverage:**
- ✅ Scraper (dre.pt API) → Task 6
- ✅ Parser/chunker by article → Task 5
- ✅ Embeddings (multilingual-e5-large) → Task 3
- ✅ Chroma vector store with metadata → Task 4
- ✅ Hybrid retrieval (semantic + BM25) → Task 8
- ✅ DeepSeek strict generation → Task 9
- ✅ POST /query, POST /ingest, GET /status → Task 10
- ✅ Chat UI with citations → Task 12
- ✅ APScheduler re-ingestion every 7 days → Task 11
- ✅ Deduplication via ingested_ids log → Task 7
- ✅ No-answer fallback message → Task 9 (prompt) + Task 10 (routes)

**Placeholder scan:** No TBDs. All code blocks are complete.

**Type consistency:**
- `Chunk` defined in Task 2, used identically in Tasks 4, 5, 7
- `Source` defined in Task 2, returned by `HybridSearcher.search()` in Task 8, consumed in Task 10
- `ChromaStore.search()` returns `list[dict]` → `HybridSearcher.bm25_rerank()` accepts `list[dict]` ✅
- `IngestionPipeline` constructor same signature in test fixture and routes ✅
