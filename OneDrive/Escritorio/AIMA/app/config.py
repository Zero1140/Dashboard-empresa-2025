from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    deepseek_api_key: str  # Required — raises ValidationError at startup if missing
    deepseek_model: str = "deepseek-chat"
    deepseek_base_url: str = "https://api.deepseek.com"
    embedding_model: str = "intfloat/multilingual-e5-large"
    chroma_path: Path = Path("./data/chroma_db")
    raw_data_path: Path = Path("./data/raw")
    ingestion_log_path: Path = Path("./data/ingestion_log.json")
    ingestion_interval_days: int = 7
    top_k_semantic: int = 20
    top_k_final: int = 5

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
