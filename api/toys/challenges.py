from collections.abc import Callable
from dataclasses import dataclass, fields
from datetime import datetime, timedelta

from django.db.models import Avg, Count, Max, Q

from .models import PersonalRecord, Toy

NEW_TOY = "new-toy"
GIRTH = "girth"
DEPTH = "depth"
OLD_TOY = "old-toy"
TIME = "time"
KINDS = [NEW_TOY, GIRTH, DEPTH, OLD_TOY, TIME]

RECORD_KEYS = {GIRTH: "pr-width", DEPTH: "pr-depth", TIME: "toy-time"}

RECENT_USE = "recent-use"
NEAR_RECORD = "near-record"
REASONS = [RECENT_USE, NEAR_RECORD]
REASON_POINTS = {RECENT_USE: 3, NEAR_RECORD: 2}

NEW_TOY_POINTS = 10
LOGGED_TIME_POINTS = 1
RECENT_USE_WINDOW = timedelta(days=14)
OLD_TOY_WINDOW = timedelta(days=60)
NEAR_RECORD_SHARE = 0.75
GIRTH_STEP_POINTS = ((0.025, 5), (0.05, 3), (0.10, 1))
DEPTH_STEP_POINTS = ((0.05, 5), (0.10, 3), (0.15, 1))
OLD_TOY_POINTS = ((100, 5), (20, 4), (5, 3), (1, 2))

_FINISHED = Q(toysessionentry__session__is_live=False)


@dataclass(frozen=True)
class ToyUsage:
    id: int
    name: str
    circumference: float | None
    insertable_length: float | None
    session_count: int
    last_used_at: datetime | None
    average_minutes: float | None


@dataclass(frozen=True)
class Challenge:
    kind: str
    toy: ToyUsage
    points: int
    target: float | None = None
    best: float | None = None
    reasons: tuple[str, ...] = ()


@dataclass(frozen=True)
class ChallengeCtx:
    toys: list[ToyUsage]
    girth_record: float | None
    depth_record: float | None
    time_records: dict[int, float]
    now: datetime


def step_points(step: float, bands: tuple[tuple[float, int], ...]) -> int | None:
    return next((points for limit, points in bands if step <= limit), None)


def old_toy_points(session_count: int) -> int:
    return next((points for minimum, points in OLD_TOY_POINTS if session_count >= minimum), 0)


def _challenge(kind: str, toy: ToyUsage, base: int, reasons=(), **values) -> Challenge:
    points = base + sum(REASON_POINTS[reason] for reason in reasons)
    return Challenge(kind, toy, points, reasons=tuple(reasons), **values)


def _recent_use(toy: ToyUsage, now: datetime) -> tuple[str, ...]:
    recent = toy.last_used_at is not None and toy.last_used_at >= now - RECENT_USE_WINDOW
    return (RECENT_USE,) if recent else ()


def _new_toy(ctx: ChallengeCtx) -> list[Challenge]:
    return [_challenge(NEW_TOY, toy, NEW_TOY_POINTS) for toy in ctx.toys if toy.session_count == 0]


def _size_challenges(
    kind: str,
    ctx: ChallengeCtx,
    record: float | None,
    size_of: Callable[[ToyUsage], float | None],
    bands: tuple[tuple[float, int], ...],
) -> list[Challenge]:
    if not record:
        return []
    found = []
    for toy in ctx.toys:
        size = size_of(toy)
        if size is None or size <= record:
            continue
        points = step_points((size - record) / record, bands)
        if points is not None:
            values = {"target": size, "best": record}
            found.append(_challenge(kind, toy, points, _recent_use(toy, ctx.now), **values))
    return found


def _girth(ctx: ChallengeCtx) -> list[Challenge]:
    return _size_challenges(
        GIRTH, ctx, ctx.girth_record, lambda toy: toy.circumference, GIRTH_STEP_POINTS
    )


def _depth(ctx: ChallengeCtx) -> list[Challenge]:
    return _size_challenges(
        DEPTH, ctx, ctx.depth_record, lambda toy: toy.insertable_length, DEPTH_STEP_POINTS
    )


def _old_toy(ctx: ChallengeCtx) -> list[Challenge]:
    cutoff = ctx.now - OLD_TOY_WINDOW
    return [
        _challenge(OLD_TOY, toy, old_toy_points(toy.session_count))
        for toy in ctx.toys
        if toy.last_used_at is not None and toy.last_used_at <= cutoff
    ]


def _time(ctx: ChallengeCtx) -> list[Challenge]:
    found = []
    for toy in ctx.toys:
        if toy.session_count == 0:
            continue
        best = ctx.time_records.get(toy.id)
        if best is None:
            found.append(_challenge(TIME, toy, 0))
            continue
        reasons = _recent_use(toy, ctx.now)
        if toy.average_minutes is not None and toy.average_minutes >= NEAR_RECORD_SHARE * best:
            reasons += (NEAR_RECORD,)
        values = {"target": best + 1, "best": best}
        found.append(_challenge(TIME, toy, LOGGED_TIME_POINTS, reasons, **values))
    return found


_DEFINITIONS = (_new_toy, _girth, _depth, _old_toy, _time)


def _toy_usage() -> list[ToyUsage]:
    rows = (
        Toy.objects.filter(retired=False)
        .annotate(
            session_count=Count("toysessionentry", filter=_FINISHED),
            last_used_at=Max("toysessionentry__session__started_at", filter=_FINISHED),
            average_minutes=Avg("toysessionentry__duration_minutes", filter=_FINISHED),
        )
        .values(*(field.name for field in fields(ToyUsage)))
    )
    return [ToyUsage(**row) for row in rows]


def _record(kind: str) -> float | None:
    records = PersonalRecord.objects.filter(key=RECORD_KEYS[kind])
    return records.aggregate(best=Max("value"))["best"]


def _toy_records(kind: str) -> dict[int, float]:
    records = PersonalRecord.objects.filter(key=RECORD_KEYS[kind]).values("toy")
    return {row["toy"]: row["best"] for row in records.annotate(best=Max("value"))}


def _sort_key(challenge: Challenge):
    return (-challenge.points, -challenge.toy.id)


def sort_challenges(found: list[Challenge]) -> list[Challenge]:
    return sorted(found, key=_sort_key)


def find_challenges(now: datetime) -> list[Challenge]:
    ctx = ChallengeCtx(
        toys=_toy_usage(),
        girth_record=_record(GIRTH),
        depth_record=_record(DEPTH),
        time_records=_toy_records(TIME),
        now=now,
    )
    found = [challenge for definition in _DEFINITIONS for challenge in definition(ctx)]
    return sort_challenges(found)
