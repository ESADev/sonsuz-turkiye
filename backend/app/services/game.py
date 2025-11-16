from __future__ import annotations

from sqlmodel import select

from ..database import get_session
from ..models import Combination, Element
from ..schemas import CombineResponse, ElementSummary
from . import gemini


def normalize_name(name: str) -> str:
    return name.casefold().strip()


def make_order_key(a_id: int, b_id: int) -> str:
    return "::".join(str(part) for part in sorted([a_id, b_id]))


async def combine_elements(element_a: Element, element_b: Element) -> CombineResponse:
    with get_session() as db:
        if not element_a or not element_b:
            raise ValueError("Element not found")

        result_element = None

        try:
            result_element = await gemini.call_gemini(element_a, element_b)
        except gemini.GeminiError as exc:
            raise ValueError("Gemini isteği başarısız oldu") from exc

        return CombineResponse(element=_to_summary(result_element), created=True)


def _to_summary(element: Element) -> ElementSummary:
    return ElementSummary(
        id=element.id,
        name=element.name,
        emoji=element.emoji,
        is_seed=element.is_seed,
    )
