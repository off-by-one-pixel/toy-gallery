from __future__ import annotations

from collections.abc import Callable, Iterable
from datetime import timedelta
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from . import models

DEFAULT_SESSION_MINUTES = 30


def value_or_none(t: tuple[object, float] | None) -> float | None:
    return t[1] if t else None


def max_entry_or_none(
    values: Iterable[models.ToySessionEntry | None], accessor: Callable
) -> tuple[models.ToySessionEntry, float] | None:
    filtered = [v for v in values if accessor(v) is not None]
    max_entry = max(filtered, key=accessor) if filtered else None
    return (max_entry, accessor(max_entry)) if max_entry else None


class SessionDimensions:
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

    @classmethod
    def total_toy_duration(cls, session: models.Session) -> int | None:
        durations = [e.duration_minutes for e in session.entries.all() if e.duration_minutes]
        return sum(durations) if durations else None

    @classmethod
    def total_session_duration(cls, session: models.Session) -> int | None:
        if session.started_at and session.ended_at:
            return int((session.ended_at - session.started_at) / timedelta(minutes=1))

    @classmethod
    def session_duration_or_default(cls, session: models.Session) -> int:
        duration = cls.total_session_duration(session)
        return DEFAULT_SESSION_MINUTES if duration is None else duration
