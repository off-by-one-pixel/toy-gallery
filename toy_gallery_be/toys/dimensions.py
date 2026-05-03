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
    """Peaks across a Session's entries, gated by involvement level.

    Each involvement contributes differently to a session's headline numbers:

    - ``USED``: the toy was present but not inserted; contributes neither
      length nor circumference.
    - ``INSERTED``: partially inserted — circumference (girth at depth)
      counts but the toy's full insertable length does not.
    - ``FULLY_INSERTED``: both circumference and length count.

    Length and circumference are taken independently, so the two figures
    can come from different toys.
    """

    @staticmethod
    def _length_entries(session: "models.Session"):
        # Local import to avoid a cycle (this module is imported by serializers
        # which are imported by views which import models).
        from .models import ToySessionEntry

        return [e for e in session.entries.all() if e.involvement == ToySessionEntry.FULLY_INSERTED]

    @staticmethod
    def _circumference_entries(session: "models.Session"):
        from .models import ToySessionEntry

        contributing = (ToySessionEntry.INSERTED, ToySessionEntry.FULLY_INSERTED)
        return [e for e in session.entries.all() if e.involvement in contributing]

    @classmethod
    def peak_length(cls, session: "models.Session") -> Optional[float]:
        values = [
            e.toy.insertable_length
            for e in cls._length_entries(session)
            if e.toy.insertable_length is not None
        ]
        return max(values) if values else None

    @classmethod
    def peak_circumference(cls, session: "models.Session") -> Optional[float]:
        values = [
            c
            for c in (ToyDimensions.circumference(e.toy) for e in cls._circumference_entries(session))
            if c is not None
        ]
        return max(values) if values else None
