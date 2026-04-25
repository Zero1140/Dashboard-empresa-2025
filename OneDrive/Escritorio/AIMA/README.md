# AIMA — Assistente de Legislação Portuguesa de Imigração

Sistema RAG local para consulta de legislação portuguesa de imigração e residência, baseado em documentos do Diário da República.

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

- `POST /query` — consulta legal (JSON: `{"question": "..."}`)
- `POST /ingest` — forçar re-indexação (JSON: `{"force": true}`)
- `GET /status` — estado do sistema (total de fragmentos, última indexação)

## Testes

```bash
pytest tests/ -v
```

## Arquitectura

```
dre.pt → Scraper → Parser → Embedder (multilingual-e5-large)
                                    ↓
                              ChromaDB (local)
                                    ↓
Query → HybridSearcher (semantic top-20 + BM25 re-rank top-5)
                                    ↓
                         DeepSeek API (strict grounded generation)
                                    ↓
                            Chat UI (HTML/JS)
```
