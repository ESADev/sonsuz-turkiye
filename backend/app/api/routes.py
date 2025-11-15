from __future__ import annotations

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from ..database import get_session
from ..models import Element
from ..schemas import CombineRequest, CombineResponse, ElementSummary, ElementsResponse
from ..services import game

router = APIRouter()


@router.get("/elements", response_model=ElementsResponse)
def get_elements(q: str | None = None) -> ElementsResponse:
    with get_session() as db:
        query = select(Element).order_by(Element.is_seed.desc(), Element.created_at)
        elements = db.exec(query).all()
        if q:
            lowered = q.casefold()
            elements = [el for el in elements if lowered in el.name_tr.casefold()]
        summaries = [
            ElementSummary(id=el.id, name_tr=el.name_tr, emoji=el.emoji, is_seed=el.is_seed)
            for el in elements
        ]
        return ElementsResponse(elements=summaries)


@router.post("/combine", response_model=CombineResponse)
async def combine(payload: CombineRequest) -> CombineResponse:
    try:
        return await game.combine_elements(payload.elementAId, payload.elementBId)
    except ValueError as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=str(exc)) from exc


