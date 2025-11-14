from __future__ import annotations

import json
import logging
from typing import Optional

import httpx

from ..config import get_settings
from ..models import Element
from ..schemas import GeminiElementResponse
from . import safety
from .examples import EXAMPLE_COMBINATIONS

logger = logging.getLogger(__name__)
settings = get_settings()


class GeminiError(Exception):
    """Raised when Gemini request fails."""


async def call_gemini(element_a: Element, element_b: Element, *, allow_unsafe: bool = False) -> GeminiElementResponse:
    if not settings.gemini_api_key:
        return simulate_element(element_a, element_b)

    endpoint = settings.gemini_endpoint.format(model=settings.gemini_model)
    headers = {"Content-Type": "application/json"}
    params = {"key": settings.gemini_api_key}
    prompt = _build_prompt(element_a, element_b)
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": prompt},
                ],
            }
        ]
    }

    async with httpx.AsyncClient(timeout=settings.gemini_timeout_seconds) as client:
        response = await client.post(endpoint, params=params, headers=headers, json=payload)
        if response.status_code >= 400:
            logger.error("Gemini API error %s: %s", response.status_code, response.text)
            raise GeminiError(response.text)
        data = response.json()

    text = _extract_text_from_response(data)
    if not text:
        raise GeminiError("No text in Gemini response")

    try:
        parsed = GeminiElementResponse.model_validate_json(text)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to parse Gemini JSON: %s", exc)
        raise GeminiError("Invalid JSON from Gemini") from exc

    parsed.tags = safety.sanitize_tags(parsed.tags)
    return parsed


def _extract_text_from_response(data: dict) -> Optional[str]:
    try:
        candidates = data.get("candidates", [])
        if not candidates:
            return None
        content = candidates[0].get("content", {})
        parts = content.get("parts", [])
        for part in parts:
            if "text" in part:
                return part["text"].strip()
        return None
    except Exception:  # noqa: BLE001
        return None


async def moderate_with_gemini(candidate: GeminiElementResponse) -> bool:
    if not settings.gemini_api_key:
        return True
    endpoint = settings.gemini_endpoint.format(model=settings.moderation_model)
    params = {"key": settings.gemini_api_key}
    prompt = json.dumps({
        "name": candidate.name_tr,
        "description": candidate.description_tr,
        "tags": candidate.tags,
    }, ensure_ascii=False)
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": (
                            "Bu içeriği değerlendir ve 'safe' veya 'unsafe' olarak cevap ver. "
                            "Sadece bu iki kelimeden birini yaz.\n\n" + prompt
                        )
                    }
                ],
            }
        ]
    }
    async with httpx.AsyncClient(timeout=settings.gemini_timeout_seconds) as client:
        response = await client.post(endpoint, params=params, json=payload)
        if response.status_code >= 400:
            logger.warning("Moderation request failed: %s", response.text)
            return False
        data = response.json()
    text = _extract_text_from_response(data)
    if not text:
        return False
    normalized = text.strip().lower()
    return "unsafe" not in normalized


def _build_prompt(element_a: Element, element_b: Element) -> str:
    example_lines = "\n".join(
        f"Örnek: {a} + {b} -> {c}" for a, b, c in EXAMPLE_COMBINATIONS
    )
    return (
        "Sonsuz Türkiye adlı crafting oyununda iki elementi birleştiriyorsun.\n"
        "Aşağıdaki iki elementten yeni bir Türkçe element üret.\n"
        "Türk kültürü, interneti ve gündelik hayatı önceliklendir.\n"
        "Sadece JSON çıktısı ver.\n\n"
        f"Element A: \"{element_a.name_tr}\"\n"
        f"Açıklama: \"{element_a.description_tr or ''}\"\n\n"
        f"Element B: \"{element_b.name_tr}\"\n"
        f"Açıklama: \"{element_b.description_tr or ''}\"\n\n"
        "Yanıt formatı:\n"
        "{\n  \"name_tr\": \"...\",\n  \"emoji\": \"...\",\n  \"description_tr\": \"...\",\n  \"tags\": [\"...\"]\n}\n\n"
        + example_lines
    )


def simulate_element(element_a: Element, element_b: Element) -> GeminiElementResponse:
    name = f"{element_a.name_tr.split()[0]} {element_b.name_tr.split()[0]} Harmanı"
    emoji = element_a.emoji or element_b.emoji or "✨"
    description = (
        f"{element_a.name_tr} ile {element_b.name_tr} birleşince ortaya çıkan keyifli bir Türk harmanı."
    )
    tags = safety.sanitize_tags(["simülasyon", "yerel", element_a.name_tr, element_b.name_tr])
    return GeminiElementResponse(name_tr=name[:40], emoji=emoji, description_tr=description[:140], tags=tags)
