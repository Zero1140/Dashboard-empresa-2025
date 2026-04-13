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
