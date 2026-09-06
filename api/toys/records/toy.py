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


def _is_equal_result(record_a, record_b):
    return bool(record_a and record_b and record_a.value == record_b.value)


def _get_session_record(ctx: SessionRecordCheckCtx):
    records = {}
    for r in ctx.session.records.all():  # pyright: ignore[reportAttributeAccessIssue]
        toy_id = r.toy_id
        if toy_id:
            records.setdefault(toy_id, {})[r.key] = r
    return records


def _calculate_toys_records(ctx: SessionRecordCheckCtx):  # pyright: ignore[reportUnusedFunction]
    toy_records = _get_session_record(ctx)
    for t in ctx.session.entries.all():
        toy_ctx = ToyRecordCheckCtx(
            sessions=[
                s for s in ctx.sessions if any(e.toy_id == t.toy_id for e in s.entries.all())
            ],
            entry=t,
        )
        for key, check in TOY_RECORD_DEFINITIONS.items():
            result = check(toy_ctx)
            existing_result = toy_records.get(t.toy_id, {}).get(key)
            if not _is_equal_result(existing_result, result):
                if existing_result:
                    _delete_record(existing_result)
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
    def accessor(s: Session) -> int | None:
        return ToySessionEntry.INVOLVEMENT_VALUE[
            s.entries.filter(toy=ctx.entry.toy).get().involvement
        ]

    return _pr_field(ctx, accessor)
