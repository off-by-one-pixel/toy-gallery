from collections import defaultdict
from datetime import date, datetime, time, timedelta
from datetime import tzinfo as TzInfo

from . import models
from .dimensions import SessionDimensions


def session_duration(session: models.Session) -> float | None:
    minutes = [
        entry.duration_minutes
        for entry in session.entries.all()
        if entry.duration_minutes is not None
    ]
    return float(sum(minutes)) if minutes else None


FIELD_EXTRACTORS = {
    "insertable_length": SessionDimensions.peak_length,
    "circumference": SessionDimensions.peak_circumference,
    "duration": session_duration,
}


def _present(values: list[float | None]) -> list[float]:
    return [v for v in values if v is not None]


def _reduce_min(values: list[float | None]) -> float | None:
    present = _present(values)
    return min(present) if present else None


def _reduce_max(values: list[float | None]) -> float | None:
    present = _present(values)
    return max(present) if present else None


def _reduce_sum(values: list[float | None]) -> float | None:
    present = _present(values)
    return sum(present) if present else None


def _reduce_avg(values: list[float | None]) -> float | None:
    present = _present(values)
    return sum(present) / len(present) if present else None


def _reduce_first(values: list[float | None]) -> float | None:
    return values[0] if values else None


def _reduce_last(values: list[float | None]) -> float | None:
    return values[-1] if values else None


REDUCERS = {
    "min": _reduce_min,
    "max": _reduce_max,
    "sum": _reduce_sum,
    "avg": _reduce_avg,
    "first": _reduce_first,
    "last": _reduce_last,
}


def bucket_key(local_dt: datetime, group_by: str) -> date | int:
    if group_by == "date":
        return local_dt.date()
    if group_by == "hour":
        return local_dt.hour
    return local_dt.weekday()


def range_bounds(
    start: date | None, end: date | None, zone: TzInfo
) -> tuple[datetime | None, datetime | None]:
    lower = datetime.combine(start, time.min, zone) if start else None
    upper = datetime.combine(end + timedelta(days=1), time.min, zone) if end else None
    return lower, upper


Metric = tuple[str, str, str | None]


def _bucket_values(sessions: list[models.Session], metrics: list[Metric]) -> dict:
    values: dict = {}
    for token, func, field in metrics:
        if func == "count":
            values[token] = len(sessions)
        else:
            extracted = [FIELD_EXTRACTORS[field](s) for s in sessions]
            values[token] = REDUCERS[func](extracted)
    return values


def compute_stats(sessions, group_by: str, metrics: list[Metric], zone: TzInfo) -> list[dict]:
    ordered = sorted(sessions, key=lambda s: (s.started_at, s.pk))
    buckets: dict = defaultdict(list)
    for session in ordered:
        buckets[bucket_key(session.started_at.astimezone(zone), group_by)].append(session)
    return [
        {"key": str(key), "values": _bucket_values(buckets[key], metrics)}
        for key in sorted(buckets)
    ]
