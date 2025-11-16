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
    elementA: str
    elementB: str


class GeminiElementResponse(BaseModel):
    name: str
    emoji: str


class CombineResponse(BaseModel):
    element: ElementSummary
    created: bool
