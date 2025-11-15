from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Sonsuz Türkiye API"
    database_url: str = f"sqlite:///{Path(__file__).resolve().parent.parent / 'sonsuz_turkiye.db'}"
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.0-flash-lite"
    gemini_endpoint: str = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    gemini_timeout_seconds: int = 20
    cors_origins: list[str] = ["*"]

    model_config = SettingsConfigDict(env_file=(Path(__file__).resolve().parent.parent / ".env"))


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
