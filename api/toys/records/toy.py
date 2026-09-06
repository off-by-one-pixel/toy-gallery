from collections.abc import Callable

from toys.models import Session, ToySessionEntry
from toys.records import (
    TOY_RECORD_DEFINITIONS,
    RecordCheckResult,
    SessionRecordCheckCtx,
    ToyRecordCheck,
    ToyRecordCheckCtx,
    _delete_record,
    _register,
    _save_record,
)


def _calculate_toys_records(ctx: SessionRecordCheckCtx):  # pyright: ignore[reportUnusedFunction]
    for t in ctx.session.entries.all():
        toy_ctx = ToyRecordCheckCtx(
            sessions=[
                s for s in ctx.sessions if any(e.toy_id == t.toy.id for e in s.entries.all())
            ],
            entry=t,
        )
        toy_records = t.toy.records.filter(session=ctx.session).all()
        for key, check in TOY_RECORD_DEFINITIONS.items():
            for tr in toy_records:
                if tr.key == key:
                    _delete_record(tr)
            result = check(toy_ctx)
            if result:
                _save_record(key, result)


def _get_sessions_value(sessions, accessor) -> list[int]:
    res = [accessor(s) for s in sessions]
    return [r for r in res if r is not None]


def toy_record(key: str) -> Callable:
    def register(check) -> ToyRecordCheck:
        _register(TOY_RECORD_DEFINITIONS, key, check)
        return check

    return register


def _pr_field(ctx, accessor):
    prev_sessions_records = _get_sessions_value(ctx.sessions, accessor)
    current_record = accessor(ctx.entry.session)
    if current_record is not None and (
        not prev_sessions_records or current_record > max(prev_sessions_records)
    ):
        return RecordCheckResult(ctx.entry.session, ctx.entry, ctx.entry.toy, float(current_record))


@toy_record("toy-time")
def toy_time(ctx: ToyRecordCheckCtx) -> RecordCheckResult | None:
    def accessor(s: Session) -> int | None:
        return s.entries.filter(toy=ctx.entry.toy).get().duration_minutes

    return _pr_field(ctx, accessor)


@toy_record("toy-level")
def toy_level(ctx: ToyRecordCheckCtx) -> RecordCheckResult | None:
    toy = ctx.entry.toy

    def accessor(s: Session) -> int | None:
        return ToySessionEntry.INVOLVEMENT_VALUE[s.entries.filter(toy=toy).get().involvement]

    return _pr_field(ctx, accessor)
