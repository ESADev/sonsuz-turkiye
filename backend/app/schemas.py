from __future__ import annotations

from datetime import datetime
from typing import List

from pydantic import BaseModel, Field


class ElementBase(BaseModel):
    id: int
    name_tr: str
    emoji: str
    description_tr: str | None = None
    tags: List[str] = Field(default_factory=list)


class ElementSummary(BaseModel):
    id: int
    name_tr: str
    emoji: str
    is_seed: bool = False
    description_tr: str | None = None


class SessionCreateRequest(BaseModel):
    safetyOverride: bool | None = False


class SessionCreateResponse(BaseModel):
    sessionId: str
    discoveredElementIds: List[int]


class ElementsResponse(BaseModel):
    elements: List[ElementSummary]


class CombineRequest(BaseModel):
    sessionId: str
    elementAId: int
    elementBId: int
    allowUnsafe: bool | None = False


class GeminiElementResponse(BaseModel):
    name_tr: str
    emoji: str


class CombineResult(BaseModel):
    element: ElementBase
    isNewElementForSession: bool
    isFirstEverCombination: bool


class CombineResponse(BaseModel):
    element: ElementBase
    isNewElementForSession: bool
    isFirstEverCombination: bool
    combinationId: int | None = None
    rateLimitReached: bool = False


class AdminStatsElement(BaseModel):
    element_id: int
    name_tr: str
    emoji: str
    usage_count: int


class AdminStatsResponse(BaseModel):
    popular_elements: List[AdminStatsElement]
    popular_pairs: List[dict]
    total_combinations: int
    generated_at: datetime


class SessionUpdateRequest(BaseModel):
    safetyOverride: bool
