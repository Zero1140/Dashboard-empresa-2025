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
