from __future__ import annotations

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlmodel import select

from ..database import get_session
from ..models import Combination, Element, Session, SessionElement
from ..schemas import (
    AdminStatsElement,
    AdminStatsResponse,
    CombineRequest,
    CombineResponse,
    ElementSummary,
    ElementsResponse,
    SessionCreateRequest,
    SessionCreateResponse,
    SessionUpdateRequest,
)
from ..services import game

router = APIRouter()


@router.post("/session", response_model=SessionCreateResponse)
def create_session(payload: SessionCreateRequest | None = None):
    with get_session() as db:
        session = Session(safety_override=payload.safetyOverride if payload else False)
        db.add(session)
        db.commit()
        db.refresh(session)

        seed_elements = db.exec(select(Element).where(Element.is_seed == True)).all()  # noqa: E712
        discovered_ids: List[int] = []
        for element in seed_elements:
            session_element = SessionElement(
                session_id=session.id,
                element_id=element.id,
                is_first_discovery=False,
            )
            db.add(session_element)
            discovered_ids.append(element.id)
        db.commit()

        return SessionCreateResponse(sessionId=session.id, discoveredElementIds=discovered_ids)


@router.patch("/session/{session_id}")
def update_session(session_id: str, payload: SessionUpdateRequest):
    with get_session() as db:
        session = db.get(Session, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        session.safety_override = payload.safetyOverride
        db.add(session)
        db.commit()
        return {"sessionId": session.id, "safetyOverride": session.safety_override}


@router.get("/elements", response_model=ElementsResponse)
def get_elements(sessionId: str = Query(...), q: str | None = None):
    with get_session() as db:
        session = db.get(Session, sessionId)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        elements = db.exec(
            select(Element)
            .join(SessionElement, SessionElement.element_id == Element.id)
            .where(SessionElement.session_id == session.id)
            .order_by(Element.is_seed.desc(), SessionElement.discovered_at)
        ).all()

        if q:
            lowered = q.casefold()
            elements = [el for el in elements if lowered in el.name_tr.casefold()]

        summaries = [
            ElementSummary(
                id=el.id,
                name_tr=el.name_tr,
                emoji=el.emoji,
                is_seed=el.is_seed,
                description_tr=el.description_tr,
            )
            for el in elements
        ]
        return ElementsResponse(elements=summaries)


@router.post("/combine", response_model=CombineResponse)
async def combine(payload: CombineRequest):
    try:
        result = await game.combine_elements(
            payload.sessionId,
            payload.elementAId,
            payload.elementBId,
            allow_unsafe=bool(payload.allowUnsafe),
        )
        return result
    except ValueError as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/admin/stats", response_model=AdminStatsResponse)
def get_stats(limit: int = 10):
    with get_session() as db:
        popular_elements = db.exec(
            select(Element, Combination.usage_count)
            .join(Combination, Combination.result_element_id == Element.id)
            .order_by(Combination.usage_count.desc())
            .limit(limit)
        ).all()

        elements_payload = [
            AdminStatsElement(
                element_id=element.id,
                name_tr=element.name_tr,
                emoji=element.emoji,
                usage_count=usage_count,
            )
            for element, usage_count in popular_elements
        ]

        popular_pairs = db.exec(
            select(Combination.order_key, Combination.usage_count)
            .order_by(Combination.usage_count.desc())
            .limit(limit)
        ).all()

        total_combinations = len(db.exec(select(Combination)).all())
        return AdminStatsResponse(
            popular_elements=elements_payload,
            popular_pairs=[{"order_key": key, "usage_count": count} for key, count in popular_pairs],
            total_combinations=total_combinations,
            generated_at=datetime.utcnow(),
        )
