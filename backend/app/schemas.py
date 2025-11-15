from __future__ import annotations

from pydantic import BaseModel


class ElementSummary(BaseModel):
    id: int
    name_tr: str
    emoji: str
    is_seed: bool = False


class ElementsResponse(BaseModel):
    elements: list[ElementSummary]


class CombineRequest(BaseModel):
    elementAId: int
    elementBId: int


class GeminiElementResponse(BaseModel):
    name_tr: str
    emoji: str


class CombineResponse(BaseModel):
    element: ElementSummary
    created: bool
