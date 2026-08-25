from __future__ import annotations

from collections.abc import Callable, Iterable
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from . import models


def value_or_none(t: tuple[object, float] | None) -> float | None:
    return t[1] if t else None

def max_entry_or_none(
    values: Iterable[models.ToySessionEntry | None], accessor: Callable
) -> tuple[models.ToySessionEntry, float] | None:
    """Max of the non-None entries, or None when none are present."""
    filtered = [v for v in values if accessor(v) is not None]
    max_entry = max(filtered, key=accessor) if filtered else None
    return (max_entry, accessor(max_entry)) if max_entry else None


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
        return value_or_none(cls.peak_length_with_entry(session))

    @classmethod
    def peak_circumference(cls, session: models.Session) -> float | None:
        return value_or_none(cls.peak_circumference_with_entry(session))

    @classmethod
    def peak_length_with_entry(
        cls, session: models.Session
    ) -> tuple[models.ToySessionEntry, float] | None:
        return max_entry_or_none(cls._length_entries(session), lambda e: e.toy.insertable_length)

    @classmethod
    def peak_circumference_with_entry(
        cls, session: models.Session
    ) -> tuple[models.ToySessionEntry, float] | None:
        return max_entry_or_none(cls._circumference_entries(session), lambda e: e.toy.circumference)
