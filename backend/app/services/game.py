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


async def combine_elements(element_a_id: int, element_b_id: int) -> CombineResponse:
    with get_session() as db:
        element_a = db.get(Element, element_a_id)
        element_b = db.get(Element, element_b_id)
        if not element_a or not element_b:
            raise ValueError("Element not found")

        order_key = make_order_key(element_a_id, element_b_id)
        combination = db.exec(
            select(Combination).where(Combination.order_key == order_key)
        ).one_or_none()

        if combination:
            result_element = db.get(Element, combination.result_element_id)
            if not result_element:
                db.delete(combination)
                db.commit()
                return await combine_elements(element_a_id, element_b_id)
            return CombineResponse(element=_to_summary(result_element), created=False)

        try:
            candidate = await gemini.call_gemini(element_a, element_b)
        except gemini.GeminiError as exc:
            raise ValueError("Gemini isteği başarısız oldu") from exc
        normalized = normalize_name(candidate.name_tr)[:80]
        existing = db.exec(
            select(Element).where(Element.normalized_name == normalized)
        ).one_or_none()

        if existing:
            result_element = existing
        else:
            result_element = Element(
                name_tr=candidate.name_tr[:40],
                normalized_name=normalized,
                emoji=candidate.emoji[:8],
            )
            db.add(result_element)
            db.commit()
            db.refresh(result_element)

        combination = Combination(
            element_a_id=element_a_id,
            element_b_id=element_b_id,
            result_element_id=result_element.id,
            order_key=order_key,
        )
        db.add(combination)
        db.commit()
        db.refresh(result_element)

        return CombineResponse(element=_to_summary(result_element), created=True)


def _to_summary(element: Element) -> ElementSummary:
    return ElementSummary(
        id=element.id,
        name_tr=element.name_tr,
        emoji=element.emoji,
        is_seed=element.is_seed,
    )
