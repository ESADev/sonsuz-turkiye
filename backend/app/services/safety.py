from __future__ import annotations

import re
from typing import Iterable

from ..config import get_settings

settings = get_settings()


BLOCKLIST_REGEX = re.compile(r"|".join(re.escape(term) for term in settings.safety_blocklist), re.IGNORECASE)


def is_safe_text(text: str, allow_unsafe: bool = False) -> bool:
    # Global master switch disables all moderation when False
    if not settings.moderation_enabled:
        return True
    if allow_unsafe:
        return True
    if not text:
        return True
    return BLOCKLIST_REGEX.search(text) is None


def ensure_safe_element(name: str, description: str, allow_unsafe: bool = False) -> bool:
    return is_safe_text(name, allow_unsafe) and is_safe_text(description, allow_unsafe)


def sanitize_tags(tags: Iterable[str]) -> list[str]:
    # When moderation is globally disabled, keep tags as-is (only trim length)
    if not settings.moderation_enabled:
        sanitized_simple: list[str] = []
        for tag in tags:
            cleaned = tag.strip()
            if cleaned:
                sanitized_simple.append(cleaned[:30])
        return sanitized_simple
    sanitized: list[str] = []
    for tag in tags:
        cleaned = tag.strip()
        if cleaned and is_safe_text(cleaned):
            sanitized.append(cleaned[:30])
    return sanitized
