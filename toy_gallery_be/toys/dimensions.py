"""Single source of truth for dimensional logic.

Split by domain: ``ShapeDimensions`` (aggregates over a Shape's sections),
``ToyDimensions`` (delegates through a Toy's shape, plus toy-only metrics),
and ``SessionDimensions`` (peaks across a Session's inserted entries).
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from . import models


class ShapeDimensions:
    """Aggregates that fall out of a Shape's sections."""

    @staticmethod
    def height(shape: "models.Shape") -> float:
        return sum(s.height for s in shape.sections.all())

    @staticmethod
    def diameter(shape: "models.Shape") -> float:
        sections = list(shape.sections.all())
        if not sections:
            return 0.0
        return max(s.diameter for s in sections)

    @staticmethod
    def circumference(shape: "models.Shape") -> Optional[float]:
        values = [s.circumference for s in shape.sections.all() if s.circumference is not None]
        return max(values) if values else None


class ToyDimensions:
    """Toy-level metrics. Most just delegate through to ``ShapeDimensions``."""

    @staticmethod
    def height(toy: "models.Toy") -> float:
        return ShapeDimensions.height(toy.shape)

    @staticmethod
    def diameter(toy: "models.Toy") -> float:
        return ShapeDimensions.diameter(toy.shape)

    @staticmethod
    def circumference(toy: "models.Toy") -> Optional[float]:
        return ShapeDimensions.circumference(toy.shape)


class SessionDimensions:
    """Peaks across a Session's inserted entries.

    "Used" entries are skipped — a toy that was held but not inserted does
    not contribute an insertion dimension. Length and diameter are taken
    independently, so the two figures can come from different toys.
    """

    @staticmethod
    def _inserted_entries(session: "models.Session"):
        # Local import to avoid a cycle (this module is imported by serializers
        # which are imported by views which import models).
        from .models import ToySessionEntry

        inserted_states = (ToySessionEntry.INSERTED, ToySessionEntry.FULLY_INSERTED)
        return [e for e in session.entries.all() if e.involvement in inserted_states]

    @classmethod
    def peak_length(cls, session: "models.Session") -> Optional[float]:
        values = [
            e.toy.insertable_length
            for e in cls._inserted_entries(session)
            if e.toy.insertable_length is not None
        ]
        return max(values) if values else None

    @classmethod
    def peak_diameter(cls, session: "models.Session") -> Optional[float]:
        values = [ToyDimensions.diameter(e.toy) for e in cls._inserted_entries(session)]
        return max(values) if values else None
