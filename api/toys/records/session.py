from collections.abc import Callable

from toys.dimensions import SessionDimensions, max_entry_or_none
from toys.models import PersonalRecord, Session, ToySessionEntry
from toys.records.toy import _calculate_toys_records

from . import (
    SESSION_RECORD_DEFINITIONS,
    RecordCheckResult,
    SessionRecordCheck,
    SessionRecordCheckCtx,
    _delete_record,
    _register,
    _save_record,
)


def session_record(key: str) -> Callable:
    def register(check) -> SessionRecordCheck:
        _register(SESSION_RECORD_DEFINITIONS, key, check)
        return check

    return register


def _pr_field(
    ctx: SessionRecordCheckCtx,
    accesor_session: Callable[[Session], tuple[ToySessionEntry, float] | None],
    accesor_toy: Callable[[ToySessionEntry], float | None],
) -> RecordCheckResult | None:
    current_session = accesor_session(ctx.session)
    if not current_session:
        return
    prev_sessions = [accesor_session(s) for s in ctx.sessions]
    prev_sessions_record = max_entry_or_none([r[0] for r in prev_sessions if r], accesor_toy)
    if not prev_sessions_record or current_session[1] > prev_sessions_record[1]:
        return RecordCheckResult(ctx.session, current_session[0], None, current_session[1])


def _pr_sessions_field(ctx: SessionRecordCheckCtx, accessor: Callable[[Session], float | None]):
    current = accessor(ctx.session)
    if current:
        prev = [accessor(s) for s in ctx.sessions]
        prev_filtered = [r for r in prev if r]
        if not prev_filtered or current > max(prev_filtered):
            return RecordCheckResult(ctx.session, None, None, current)


def _delete_all_records() -> None:
    PersonalRecord.objects.all().delete()


def resync_records() -> None:
    _delete_all_records()
    sessions = (
        Session.objects.order_by("-started_at").prefetch_related("entries", "entries__toy").all()
    )

    for i, s in enumerate(sessions[::-1]):
        _calculate_sessions_records(SessionRecordCheckCtx(list(sessions[len(sessions) - i :]), s))


def _check_record_by_key(ctx: SessionRecordCheckCtx, key: str) -> bool | None:
    prev_record = ctx.session.records.filter(key__exact=key).first()
    result = SESSION_RECORD_DEFINITIONS[key](ctx)
    session_records = {"value": prev_record.value, "record": prev_record} if prev_record else None
    if result:
        if session_records:
            if session_records["value"] != result.value:
                _delete_record(session_records["record"])
            else:
                return
        _save_record(key, result)
        return True
    else:
        if session_records:
            _delete_record(session_records["record"])


def _calculate_sessions_records(ctx: SessionRecordCheckCtx) -> None:
    for key in SESSION_RECORD_DEFINITIONS:
        _check_record_by_key(ctx, key)
    _calculate_toys_records(ctx)


def record_session(session: Session) -> None:
    sessions = (
        Session.objects.filter(started_at__lt=session.started_at)
        .prefetch_related("entries", "entries__toy")
        .all()
    )
    _calculate_sessions_records(SessionRecordCheckCtx(list(sessions), session))


@session_record("pr-width")
def pr_width(ctx: SessionRecordCheckCtx) -> RecordCheckResult | None:
    return _pr_field(
        ctx, SessionDimensions.peak_circumference_with_entry, lambda t: t.toy.circumference
    )


@session_record("pr-depth")
def pr_depth(ctx: SessionRecordCheckCtx) -> RecordCheckResult | None:
    return _pr_field(
        ctx, SessionDimensions.peak_length_with_entry, lambda t: t.toy.insertable_length
    )


@session_record("pr-time")
def pr_time(ctx: SessionRecordCheckCtx) -> RecordCheckResult | None:
    return _pr_sessions_field(ctx, SessionDimensions.total_toy_duration)


@session_record("pr-duration")
def pr_duration(ctx: SessionRecordCheckCtx) -> RecordCheckResult | None:
    return _pr_sessions_field(ctx, SessionDimensions.total_session_duration)
