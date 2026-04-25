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
