# RAG AIMA — Sistema de Consulta de Legislación Portuguesa de Inmigración

**Fecha:** 2026-04-13
**Estado:** Aprobado
**Autor:** Claude Code + guill

---

## Objetivo

Sistema RAG (Retrieval-Augmented Generation) local que permite consultar legislación portuguesa de inmigración y residencia (Diário da República) con respuestas fundamentadas estrictamente en las fuentes legales recuperadas. Sin alucinaciones.

---

## Alcance

- Leyes de inmigración y residencia (Lei 23/2007 y modificaciones)
- Decretos-lei, portarias y diplomas relacionados con AIMA
- Disposiciones transitorias e intertemporal (validez de leyes ante cambios)
- Excluido: legislación no relacionada con inmigración/residencia

---

## Usuarios

1. **Uso propio (developer)** — consultas técnicas, citas exactas, debugging del sistema
2. **Inmigrantes** — preguntas en portugués o español sobre su situación legal

---

## Stack Tecnológico

| Componente | Tecnología |
|---|---|
| LLM (generación) | DeepSeek API (`deepseek-chat`) |
| Embeddings | `intfloat/multilingual-e5-large` (local, sentence-transformers) |
| Vector DB | Chroma (persistido en disco) |
| Backend | FastAPI + APScheduler |
| UI | HTML/CSS/JS (chat) |
| Scraper | dre.pt REST API |
| Python | 3.10+ |

---

## Estructura del Proyecto

```
/AIMA
  /app
    /ingestion        # scraper + parser + chunker
    /embeddings       # wrapper multilingual-e5-large
    /vector_store     # Chroma CRUD
    /retrieval        # hybrid search (semántico + BM25)
    /generation       # prompt builder + DeepSeek call
    /api              # FastAPI routes
    /scheduler        # APScheduler jobs
    /models           # Pydantic schemas
    config.py         # .env loader
    main.py           # entrypoint FastAPI
  /ui
    index.html
    app.js
    style.css
  /data
    /raw              # JSONs descargados de dre.pt
    /chroma_db        # vector store en disco
    ingestion_log.json
  /docs
    /superpowers/specs/
  .env
  requirements.txt
```

---

## Sección 1: Ingesta de Datos

**Fuente:** API pública de dre.pt

**Keywords de búsqueda:**
- `estrangeiros`, `imigração`, `residência`, `AIMA`, `SEF`, `autorização de residência`, `visto`, `nacionalidade`

**Tipos de diploma:**
- `lei`, `decreto-lei`, `portaria`, `despacho`

**Flujo:**
1. Consultar dre.pt API con keywords + filtro de dominio
2. Descargar texto completo (HTML → texto limpio con BeautifulSoup)
3. Guardar JSON estructurado en `/data/raw/`
4. Chunkear por artículo (`Artigo X.º` = 1 chunk, 500–1000 tokens)
5. Generar embedding por chunk
6. Upsert en Chroma (ID = `lei-numero-artigo`, evita duplicados)

**Metadata por chunk:**
```json
{
  "id": "lei-23-2007-artigo-88",
  "lei": "Lei 23/2007",
  "artigo": "Artigo 88.º",
  "titulo": "Título del artículo si existe",
  "data_publicacao": "2007-07-04",
  "url_fonte": "https://dre.pt/...",
  "texto": "..."
}
```

**Actualización periódica:**
- APScheduler ejecuta re-ingesta cada 7 días
- Solo procesa diplomas con fecha > última ingesta
- Chunks existentes no modificados → skip

---

## Sección 2: Retrieval Híbrido

**Problema:** texto legal requiere match exacto (números de artículos, nombres de leyes) Y similitud semántica.

**Solución — dos pasos:**

1. **Búsqueda semántica** — Chroma devuelve top-20 chunks por similitud coseno
2. **Re-ranking BM25** (`rank_bm25`) — sobre los 20 candidatos, prioriza términos exactos → devuelve top-5

**Resultado:**
```python
List[{
  "texto": str,
  "lei": str,
  "artigo": str,
  "score": float,
  "url": str
}]
```

---

## Sección 3: Generación (Modo Estricto)

**System prompt:**
```
Eres un asistente jurídico especializado en legislación portuguesa de 
inmigración y residencia.

REGLAS ESTRICTAS:
1. Responde ÚNICAMENTE con información presente en los fragmentos legales proporcionados.
2. Si la respuesta no está en los fragmentos → responde: "Esta información 
   não foi encontrada na legislação disponível."
3. Cita SIEMPRE: nombre de la lei + número de artigo.
4. Responde en el idioma de la pregunta (português o español).
5. No interpretes ni opines — solo informa lo que dice la ley.
```

**User message:**
```
Fragmentos legais relevantes:
[chunk 1: Lei X, Artigo Y — texto]
...

Pergunta: {query}
```

---

## Sección 4: API Endpoints

```
POST /query
  Body: { "question": "string" }
  Response: { "answer": "string", "sources": [...] }

POST /ingest
  Body: { "force": bool }  # forzar re-ingesta completa
  Response: { "status": "ok", "chunks_added": int }

GET /status
  Response: { "total_chunks": int, "last_ingestion": "ISO datetime" }
```

---

## Sección 5: UI

Chat minimalista con:
- Área de conversación
- Panel de fuentes citadas (cada fuente con link directo a dre.pt)
- Input de texto + botón enviar
- Soporte portugués y español sin configuración

---

## Sección 6: Scheduler

```python
# Al iniciar la app → ingesta inicial si /data/chroma_db vacío
# Luego → re-ingesta cada 7 días automáticamente
scheduler.add_job(run_ingestion, 'interval', days=7)
```

Logs en `/data/ingestion_log.json`.

---

## Variables de Entorno (.env)

```env
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_MODEL=deepseek-chat
EMBEDDING_MODEL=intfloat/multilingual-e5-large
CHROMA_PATH=./data/chroma_db
RAW_DATA_PATH=./data/raw
INGESTION_INTERVAL_DAYS=7
TOP_K_SEMANTIC=20
TOP_K_FINAL=5
```

---

## Dependencias Principales

```
fastapi
uvicorn
chromadb
sentence-transformers
rank-bm25
beautifulsoup4
requests
apscheduler
python-dotenv
openai  # compatible con DeepSeek API
pydantic
```

---

## Criterios de Éxito

1. Query sobre una ley específica devuelve el artículo correcto en top-5
2. Query sin respuesta en el corpus → mensaje estándar (no alucinación)
3. Re-ingesta periódica no duplica chunks existentes
4. La app arranca con `uvicorn app.main:app` sin configuración adicional
