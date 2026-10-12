from collections import defaultdict
from collections.abc import Callable
from datetime import date, datetime, time, timedelta
from datetime import tzinfo as TzInfo
from statistics import fmean

from . import models
from .dimensions import SessionDimensions

FIELD_EXTRACTORS = {
    "insertable_length": SessionDimensions.peak_length,
    "circumference": SessionDimensions.peak_circumference,
    "duration": SessionDimensions.total_toy_duration,
}


Reducer = Callable[[list[float | None]], float | None]


def _skipping_missing(reduce: Callable[[list[float]], float]) -> Reducer:
    def reducer(values: list[float | None]) -> float | None:
        present = [v for v in values if v is not None]
        return reduce(present) if present else None

    return reducer


REDUCERS: dict[str, Reducer] = {
    "min": _skipping_missing(min),
    "max": _skipping_missing(max),
    "sum": _skipping_missing(sum),
    "avg": _skipping_missing(fmean),
    "first": lambda values: values[0] if values else None,
    "last": lambda values: values[-1] if values else None,
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


def _session_bucket_keys(session: models.Session, group_by: str, zone: TzInfo) -> list:
    if group_by == "toy":
        return sorted({entry.toy_id for entry in session.entries.all()})
    return [bucket_key(session.started_at.astimezone(zone), group_by)]


def compute_stats(sessions, group_by: str, metrics: list[Metric], zone: TzInfo) -> list[dict]:
    ordered = sorted(sessions, key=lambda s: (s.started_at, s.pk))
    buckets: dict = defaultdict(list)
    for session in ordered:
        for key in _session_bucket_keys(session, group_by, zone):
            buckets[key].append(session)
    return [
        {"key": str(key), "values": _bucket_values(buckets[key], metrics)}
        for key in sorted(buckets)
    ]
