from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from . import models


class SessionDimensions:
    """Peaks across a Session's entries, gated by involvement level.

    - ``USED``: present but not inserted; contributes neither length nor
      circumference.
    - ``INSERTED``: partially inserted; circumference (girth at depth)
      counts but the toy's full insertable length does not.
    - ``FULLY_INSERTED``: both circumference and length count.

    Length and circumference are taken independently, so the two
    figures can come from different toys.
    """

    @staticmethod
    def _length_entries(session: models.Session):
        from .models import ToySessionEntry

        return [e for e in session.entries.all() if e.involvement == ToySessionEntry.FULLY_INSERTED]

    @staticmethod
    def _circumference_entries(session: models.Session):
        from .models import ToySessionEntry

        contributing = (ToySessionEntry.INSERTED, ToySessionEntry.FULLY_INSERTED)
        return [e for e in session.entries.all() if e.involvement in contributing]

    @classmethod
    def peak_length(cls, session: models.Session) -> float | None:
        values = [
            e.toy.insertable_length
            for e in cls._length_entries(session)
            if e.toy.insertable_length is not None
        ]
        return max(values) if values else None

    @classmethod
    def peak_circumference(cls, session: models.Session) -> float | None:
        values = [
            e.toy.circumference
            for e in cls._circumference_entries(session)
            if e.toy.circumference is not None
        ]
        return max(values) if values else None
