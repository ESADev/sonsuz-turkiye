from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel, UniqueConstraint


class Element(SQLModel, table=True):
    __tablename__ = "elements"

    id: Optional[int] = Field(default=None, primary_key=True)
    name_tr: str = Field(index=True, unique=True)
    normalized_name: str = Field(index=True, unique=True)
    emoji: str = Field(default="")
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    is_seed: bool = Field(default=False, nullable=False)


class Combination(SQLModel, table=True):
    __tablename__ = "combinations"
    __table_args__ = (UniqueConstraint("order_key", name="uq_combination_order"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    element_a_id: int = Field(foreign_key="elements.id")
    element_b_id: int = Field(foreign_key="elements.id")
    result_element_id: int = Field(foreign_key="elements.id")
    order_key: str = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
