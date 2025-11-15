from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Sonsuz Türkiye API"
    database_url: str = f"sqlite:///{Path(__file__).resolve().parent.parent / 'sonsuz_turkiye.db'}"
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.0-flash-lite"
    gemini_endpoint: str = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    moderation_model: str = "gemini-2.0-flash-lite"
    # Master switch to enable/disable all content moderation and safety filters
    moderation_enabled: bool = True
    gemini_timeout_seconds: int = 20
    rate_limit_per_session: int = 60
    rate_limit_reset_hours: int = 24
    safety_blocklist: List[str] = [
        "porn",
        "porno",
        "sik",
        "orospu",
        "piç",
        "aq",
        "aq.",
        "seks",
        "seksüel",
        "homo",
        "terör",
        "teror",
        "pkka",
        "pkk",
        "darbe",
        "öldür",
    ]
    fallback_element_name: str = "Güvenli Kavram"
    fallback_element_emoji: str = "🤝"
    fallback_element_description: str = "Tartışmalı içerik yerine güvenli bir kavram üretildi."
    unknown_element_name: str = "Bilinmeyen Şey"
    unknown_element_emoji: str = "❓"
    unknown_element_description: str = (
        "AI bu kombinasyon için net bir şey bulamadı, ama merak uyandıran bir bilinmeyen."
    )
    cors_origins: List[str] = ["*"]

    model_config = SettingsConfigDict(env_file=(Path(__file__).resolve().parent.parent / ".env"))


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
