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
            temperature=0.1,
            max_tokens=1024,
        )
        return response.choices[0].message.content.strip()
