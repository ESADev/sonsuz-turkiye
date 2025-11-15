from sqlmodel import select

from .database import get_session
from .models import Element
from .services.game import normalize_name

SEED_ELEMENTS = [
    {"name_tr": "Su", "emoji": "💧"},
    {"name_tr": "Ateş", "emoji": "🔥"},
    {"name_tr": "Toprak", "emoji": "🌱"},
    {"name_tr": "Hava", "emoji": "💨"},
]


def seed_base_elements() -> None:
    with get_session() as session:
        for item in SEED_ELEMENTS:
            normalized = normalize_name(item["name_tr"])
            existing = session.exec(
                select(Element).where(Element.normalized_name == normalized)
            ).one_or_none()
            if existing:
                if not existing.is_seed:
                    existing.is_seed = True
                    session.add(existing)
                continue
            element = Element(
                name_tr=item["name_tr"],
                normalized_name=normalized,
                emoji=item["emoji"],
                is_seed=True,
            )
            session.add(element)
        session.commit()
