from collections.abc import Callable
from dataclasses import dataclass, fields
from datetime import datetime, timedelta

from django.db.models import Avg, Count, Max, Q

from .models import Toy, ToySessionEntry

NEW_TOY = "new-toy"
GIRTH = "girth"
DEPTH = "depth"
OLD_TOY = "old-toy"
TIME = "time"
KINDS = [NEW_TOY, GIRTH, DEPTH, OLD_TOY, TIME]

RECENT_USE = "recent-use"
NEAR_RECORD = "near-record"
REASONS = [RECENT_USE, NEAR_RECORD]
REASON_POINTS = {RECENT_USE: 3, NEAR_RECORD: 2}

NEW_TOY_POINTS = 10
RECENT_USE_WINDOW = timedelta(days=14)
OLD_TOY_WINDOW = timedelta(days=60)
NEAR_RECORD_SHARE = 0.75
STEP_POINTS = ((0.025, 5), (0.05, 3), (0.10, 1))
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
    best_minutes: int | None
    average_minutes: float | None


@dataclass(frozen=True)
class Challenge:
    kind: str
    toy: ToyUsage
    points: int
    target: float | None = None
    best: float | None = None
    reasons: tuple[str, ...] = ()
    step: float = 0.0


@dataclass(frozen=True)
class ChallengeCtx:
    toys: list[ToyUsage]
    peak_circumference: float | None
    peak_length: float | None
    now: datetime


def step_points(step: float) -> int | None:
    return next((points for limit, points in STEP_POINTS if step <= limit), None)


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
    kind: str, ctx: ChallengeCtx, peak: float | None, size_of: Callable[[ToyUsage], float | None]
) -> list[Challenge]:
    if not peak:
        return []
    found = []
    for toy in ctx.toys:
        size = size_of(toy)
        if size is None or size <= peak:
            continue
        step = (size - peak) / peak
        points = step_points(step)
        if points is not None:
            reasons = _recent_use(toy, ctx.now)
            found.append(_challenge(kind, toy, points, reasons, target=size, best=peak, step=step))
    return found


def _girth(ctx: ChallengeCtx) -> list[Challenge]:
    return _size_challenges(GIRTH, ctx, ctx.peak_circumference, lambda toy: toy.circumference)


def _depth(ctx: ChallengeCtx) -> list[Challenge]:
    return _size_challenges(DEPTH, ctx, ctx.peak_length, lambda toy: toy.insertable_length)


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
        reasons = _recent_use(toy, ctx.now)
        best = toy.best_minutes
        if best is None or toy.average_minutes is None:
            found.append(_challenge(TIME, toy, 0, reasons))
            continue
        if toy.average_minutes >= NEAR_RECORD_SHARE * best:
            reasons += (NEAR_RECORD,)
        found.append(_challenge(TIME, toy, 0, reasons, target=best + 1, best=best))
    return found


_DEFINITIONS = (_new_toy, _girth, _depth, _old_toy, _time)


def _toy_usage() -> list[ToyUsage]:
    rows = (
        Toy.objects.filter(retired=False)
        .annotate(
            session_count=Count("toysessionentry", filter=_FINISHED),
            last_used_at=Max("toysessionentry__session__started_at", filter=_FINISHED),
            best_minutes=Max("toysessionentry__duration_minutes", filter=_FINISHED),
            average_minutes=Avg("toysessionentry__duration_minutes", filter=_FINISHED),
        )
        .values(*(field.name for field in fields(ToyUsage)))
    )
    return [ToyUsage(**row) for row in rows]


def _peak(field: str, involvements: tuple[str, ...]) -> float | None:
    entries = ToySessionEntry.objects.filter(session__is_live=False, involvement__in=involvements)
    return entries.aggregate(peak=Max(f"toy__{field}"))["peak"]


def _sort_key(challenge: Challenge):
    toy = challenge.toy
    kind_order = KINDS.index(challenge.kind)
    return (-challenge.points, kind_order, challenge.step, toy.name.casefold(), toy.id)


def sort_challenges(found: list[Challenge]) -> list[Challenge]:
    return sorted(found, key=_sort_key)


def find_challenges(now: datetime) -> list[Challenge]:
    ctx = ChallengeCtx(
        toys=_toy_usage(),
        peak_circumference=_peak("circumference", ToySessionEntry.CIRCUMFERENCE_INVOLVEMENTS),
        peak_length=_peak("insertable_length", ToySessionEntry.LENGTH_INVOLVEMENTS),
        now=now,
    )
    found = [challenge for definition in _DEFINITIONS for challenge in definition(ctx)]
    return sort_challenges(found)
