from __future__ import annotations

from datetime import datetime, timedelta
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import uuid4

from sqlmodel import Column, Field, JSON, SQLModel, UniqueConstraint


class Element(SQLModel, table=True):
    __tablename__ = "elements"

    id: Optional[int] = Field(default=None, primary_key=True)
    name_tr: str = Field(index=True, unique=True)
    normalized_name: str = Field(index=True, unique=True)
    emoji: str = Field(default="")
    description_tr: str = Field(default="")
    tags: List[str] = Field(default_factory=list, sa_column=Column(JSON))
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
    usage_count: int = Field(default=1, nullable=False)


class Session(SQLModel, table=True):
    __tablename__ = "sessions"

    id: str = Field(default_factory=lambda: uuid4().hex, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_active_at: datetime = Field(default_factory=datetime.utcnow)
    gemini_calls: int = Field(default=0)
    rate_limit_reset_at: datetime = Field(default_factory=lambda: datetime.utcnow() + timedelta(hours=24))
    safety_override: bool = Field(default=False, nullable=False)


class SessionElement(SQLModel, table=True):
    __tablename__ = "session_elements"
    __table_args__ = (UniqueConstraint("session_id", "element_id", name="uq_session_element"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(foreign_key="sessions.id")
    element_id: int = Field(foreign_key="elements.id")
    discovered_at: datetime = Field(default_factory=datetime.utcnow)
    is_first_discovery: bool = Field(default=False, nullable=False)


class CombinationLog(SQLModel, table=True):
    __tablename__ = "combination_logs"

    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(index=True)
    element_a_id: int = Field(index=True)
    element_b_id: int = Field(index=True)
    result_element_id: int = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    was_safe: bool = Field(default=True)
    order_key: str = Field(index=True)
