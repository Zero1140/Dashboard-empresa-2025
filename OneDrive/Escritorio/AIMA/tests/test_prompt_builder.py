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
