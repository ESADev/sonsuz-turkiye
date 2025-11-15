from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

import httpx

from ..config import get_settings
from ..models import Element
from ..schemas import GeminiElementResponse
from . import safety
from .examples import EXAMPLE_COMBINATIONS

DEBUG_LOG = Path(__file__).parent.parent.parent.parent / "gemini_debug.txt"

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

    with open(DEBUG_LOG, "a", encoding="utf-8") as f:
        f.write(f"\n{'='*80}\n[{datetime.utcnow()}] REQUEST: {element_a.name_tr} + {element_b.name_tr}\n{'='*80}\n")
        f.write(f"{prompt}\n")

    async with httpx.AsyncClient(timeout=settings.gemini_timeout_seconds) as client:
        response = await client.post(endpoint, params=params, headers=headers, json=payload)
        if response.status_code >= 400:
            with open(DEBUG_LOG, "a", encoding="utf-8") as f:
                f.write(f"\n[{datetime.utcnow()}] ERROR: {response.status_code}\n{response.text}\n")
            logger.error("Gemini API error %s: %s", response.status_code, response.text)
            raise GeminiError(response.text)
        data = response.json()

    text = _extract_text_from_response(data)
    
    with open(DEBUG_LOG, "a", encoding="utf-8") as f:
        f.write(f"\n[{datetime.utcnow()}] RESPONSE:\n{json.dumps(data, indent=2, ensure_ascii=False)}\n")
    if not text:
        raise GeminiError("No text in Gemini response")

    try:
        parsed = _parse_candidate_response(text)
    except ValueError as exc:
        logger.warning("Failed to parse Gemini response: %s", exc)
        raise GeminiError("Invalid Gemini response format") from exc

    # Respect global moderation switch for tag sanitization
    parsed.tags = parsed.tags if not settings.moderation_enabled else safety.sanitize_tags(parsed.tags)
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


def _parse_candidate_response(raw_text: str) -> GeminiElementResponse:
    """Convert the raw Gemini text output into a structured candidate."""
    if not raw_text:
        raise ValueError("Empty response")
    cleaned_lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    if not cleaned_lines:
        raise ValueError("No usable content in response")
    first_line = cleaned_lines[0]
    if len(first_line) < 2:
        raise ValueError("Response too short for emoji+name")
    emoji = first_line[0]
    name = first_line[1:].strip()
    if not name:
        raise ValueError("Missing name after emoji")
    return GeminiElementResponse(name_tr=name, emoji=emoji)


async def moderate_with_gemini(candidate: GeminiElementResponse) -> bool:
    # Global master switch: when disabled, always consider content safe
    if not settings.moderation_enabled:
        return True
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

    # Debug the raw moderation response to see what's coming back
    logger.debug("Moderation response: %s", json.dumps(data, ensure_ascii=False))

    text = _extract_text_from_response(data)
    if not text:
        return False

    normalized = text.strip().lower().strip(" '\"[].,;:!?\n\r\t")
    # Only accept an explicit 'safe'; treat everything else as unsafe
    return normalized == "safe"


def _build_prompt(element_a: Element, element_b: Element) -> str:
    example_lines = "\n".join(
        "Örnekler:\n").join(f"{a}+{b}->{c}" for a, b, c in EXAMPLE_COMBINATIONS)
    
    return (
        "Görevin türk internet ve genel kültürünü temel alan kelime üretme oyununda mantıklı, tutarlı ve mümkün olduğunda komik üretimler yapmak.\n"
        "Sana verilen iki elementten yeni bir element üreteceksin.\n"
        "Yalnızca tek satır oluştur: bir emoji ve hemen ardından element ismi.\n"
        "En az 1, en fazla 3 kelimelik elementler üret.\n"
        "Bazı güzel girdi ve çıktı örnekleri. Bunları taklit etme, kreatif davran. Özgün ol. Komik üret.\n"
        f"{example_lines}\n\n"
        "Şimdi bunlardan yeni bir element üret:\n"
        f"{element_a.emoji or 'ð'} (\"{element_a.name_tr}\")+"
        f"{element_b.emoji or 'ð'} (\"{element_b.name_tr}\")->"
    )


def simulate_element(element_a: Element, element_b: Element) -> GeminiElementResponse:
    name = f"{element_a.name_tr.split()[0]} {element_b.name_tr.split()[0]} Harmanı"
    emoji = element_a.emoji or element_b.emoji or "✨"
    return GeminiElementResponse(name_tr=name[:40], emoji=emoji)
