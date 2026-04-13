import re
from bs4 import BeautifulSoup
from app.models.schemas import Chunk


def clean_html(html: str) -> str:
    """Strip HTML tags and normalize whitespace."""
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()
    text = soup.get_text(separator="\n")
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _make_chunk_id(lei: str, artigo: str) -> str:
    """Stable ID: 'lei-23-2007-artigo-88'"""
    lei_slug = re.sub(r"[^a-z0-9]", "-", lei.lower())
    lei_slug = re.sub(r"-+", "-", lei_slug).strip("-")
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
    # Match article headers with or without trailing newline
    # Handles: 'Artigo 80.º', 'Artigo 80', 'ARTIGO 80 — Titulo', inline variants
    pattern = re.compile(
        r"(Artigo\s+\d+\.?[°º]?\s*[A-Z]?\.?(?:\s*[-–][^\n]*)?\s*\n|Artigo\s+\d+\.?[°º]?\s*(?=[A-Z\n]))",
        re.IGNORECASE,
    )
    parts = pattern.split(text)
    chunks: list[Chunk] = []

    i = 1
    while i < len(parts) - 1:
        artigo_header = parts[i].strip()
        artigo_body = parts[i + 1] if i + 1 < len(parts) else ""
        num_match = re.search(r"\d+", artigo_header)
        artigo_num = num_match.group() if num_match else artigo_header

        body_lines = [l.strip() for l in artigo_body.split("\n") if l.strip()]
        titulo = body_lines[0] if body_lines else None
        if titulo and re.match(r"Artigo\s+\d+", titulo, re.IGNORECASE | re.UNICODE):
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
