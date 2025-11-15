from __future__ import annotations

from datetime import datetime, timedelta

from sqlmodel import select

from ..config import get_settings
from ..database import get_session
from ..models import Combination, CombinationLog, Element, Session, SessionElement
from ..schemas import CombineResponse, ElementBase
from . import gemini, safety

settings = get_settings()


def normalize_name(name: str) -> str:
    return name.casefold().strip()


def make_order_key(a_id: int, b_id: int) -> str:
    return "::".join(str(part) for part in sorted([a_id, b_id]))


async def combine_elements(session_id: str, element_a_id: int, element_b_id: int, allow_unsafe: bool = False) -> CombineResponse:
    with get_session() as db:
        session = db.get(Session, session_id)
        if not session:
            session = Session(id=session_id)
            db.add(session)
            db.commit()
            db.refresh(session)

        allow_unsafe = allow_unsafe or session.safety_override
        _reset_rate_limit_if_needed(session)
        order_key = make_order_key(element_a_id, element_b_id)

        element_a = db.get(Element, element_a_id)
        element_b = db.get(Element, element_b_id)
        if not element_a or not element_b:
            raise ValueError("Element not found")

        combination = db.exec(
            select(Combination).where(Combination.order_key == order_key)
        ).one_or_none()

        was_safe = True
        if combination:
            combination.usage_count += 1
            result_element = db.get(Element, combination.result_element_id)
            db.add(combination)
            db.commit()
            db.refresh(combination)
            is_first_ever = False
        else:
            if session.gemini_calls >= settings.rate_limit_per_session:
                db.commit()
                return CombineResponse(
                    element=_to_schema(_fallback_element()),
                    isNewElementForSession=False,
                    isFirstEverCombination=False,
                    combinationId=None,
                    rateLimitReached=True,
                )

                        
            candidate = await _generate_element(element_a, element_b, allow_unsafe=allow_unsafe)
            safe = safety.ensure_safe_element(candidate.name_tr, candidate.description_tr, allow_unsafe)
            # Only call model moderation if globally enabled and not explicitly overridden
            if safe and settings.moderation_enabled and not allow_unsafe:
                safe = await gemini.moderate_with_gemini(candidate)
            

            if not safe:
                was_safe = False
                candidate.name_tr = settings.fallback_element_name
                candidate.emoji = settings.fallback_element_emoji
                candidate.description_tr = settings.fallback_element_description
                candidate.tags = ["güvenli", "otomatik"]

            result_element = _upsert_element(db, candidate)
            combination = Combination(
                element_a_id=element_a_id,
                element_b_id=element_b_id,
                result_element_id=result_element.id,
                order_key=order_key,
            )
            db.add(combination)
            session.gemini_calls += 1
            is_first_ever = True

        db.add(
            CombinationLog(
                session_id=session.id,
                element_a_id=element_a_id,
                element_b_id=element_b_id,
                result_element_id=result_element.id,
                was_safe=was_safe,
                order_key=order_key,
            )
        )

        session.last_active_at = datetime.utcnow()
        db.add(session)

        is_new_for_session = _record_session_element(db, session, result_element, is_first_ever)
        db.commit()
        db.refresh(result_element)
        db.refresh(combination)

        return CombineResponse(
            element=_to_schema(result_element),
            isNewElementForSession=is_new_for_session,
            isFirstEverCombination=is_first_ever,
            combinationId=combination.id,
            rateLimitReached=False,
        )


def _reset_rate_limit_if_needed(session: Session) -> None:
    if datetime.utcnow() >= session.rate_limit_reset_at:
        session.gemini_calls = 0
        session.rate_limit_reset_at = datetime.utcnow() + timedelta(hours=settings.rate_limit_reset_hours)


async def _generate_element(element_a: Element, element_b: Element, allow_unsafe: bool) -> gemini.GeminiElementResponse:
    try:
        return await gemini.call_gemini(element_a, element_b, allow_unsafe=allow_unsafe)
    except gemini.GeminiError:
        return gemini.simulate_element(element_a, element_b)


def _upsert_element(db, candidate: gemini.GeminiElementResponse) -> Element:
    normalized = normalize_name(candidate.name_tr)[:80]
    existing = db.exec(
        select(Element).where(Element.normalized_name == normalized)
    ).one_or_none()

    if existing:
        existing.description_tr = candidate.description_tr[:180]
        existing.emoji = candidate.emoji[:8]
        existing.tags = candidate.tags
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing

    element = Element(
        name_tr=candidate.name_tr[:40],
        normalized_name=normalized,
        emoji=candidate.emoji[:8],
        description_tr=candidate.description_tr[:180],
        tags=candidate.tags,
    )
    db.add(element)
    db.commit()
    db.refresh(element)
    return element


def _record_session_element(db, session: Session, element: Element, is_first_ever: bool) -> bool:
    existing = db.exec(
        select(SessionElement).where(
            (SessionElement.session_id == session.id) & (SessionElement.element_id == element.id)
        )
    ).one_or_none()

    if existing:
        return False

    session_element = SessionElement(
        session_id=session.id,
        element_id=element.id,
        is_first_discovery=is_first_ever,
    )
    db.add(session_element)
    return True


def _fallback_element() -> Element:
    return Element(
        id=-1,
        name_tr=settings.fallback_element_name,
        normalized_name=settings.fallback_element_name.casefold(),
        emoji=settings.fallback_element_emoji,
        description_tr=settings.fallback_element_description,
        tags=["limit"],
    )


def _to_schema(element: Element) -> ElementBase:
    return ElementBase(
        id=element.id,
        name_tr=element.name_tr,
        emoji=element.emoji,
        description_tr=element.description_tr,
        tags=element.tags or [],
    )
