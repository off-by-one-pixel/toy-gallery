from collections.abc import Callable
from dataclasses import dataclass
from typing import Protocol

from toys.dimensions import SessionDimensions, max_entry_or_none
from toys.models import PersonalRecord, Session, ToySessionEntry


class DuplicateRecordKey(Exception):
    pass


@dataclass(frozen=True)
class RecordCheckResult:
    session: Session
    entry: ToySessionEntry
    value: float


@dataclass(frozen=True)
class RecordCheckCtx:
    sessions: list[Session]
    session: Session


class RecordCheck(Protocol):
    def __call__(self, ctx: RecordCheckCtx) -> RecordCheckResult | None: ...


RECORD_DEFINITIONS: dict[str, RecordCheck] = {}


def _pr_field(
    ctx: RecordCheckCtx,
    accesor_session: Callable[[Session], tuple[ToySessionEntry, float] | None],
    accesor_toy: Callable[[ToySessionEntry], float | None],
) -> RecordCheckResult | None:
    current_session = accesor_session(ctx.session)
    if not current_session:
        return
    prev_sessions = [accesor_session(s) for s in ctx.sessions]
    prev_sessions_record = max_entry_or_none([r[0] for r in prev_sessions if r], accesor_toy)
    if not prev_sessions_record or current_session[1] > prev_sessions_record[1]:
        return RecordCheckResult(ctx.session, current_session[0], current_session[1])


def _save_record(key: str, record: RecordCheckResult) -> None:
    PersonalRecord(
        key=key, session=record.session, toy_entry=record.entry, value=record.value
    ).save()


def _delete_record(record: PersonalRecord):
    record.delete()


def record(key: str) -> Callable:
    def register(check) -> RecordCheck:
        if key in RECORD_DEFINITIONS:
            raise DuplicateRecordKey(key)
        RECORD_DEFINITIONS[key] = check
        return check

    return register


def _delete_all_records() -> None:
    PersonalRecord.objects.all().delete()


def resync_records() -> None:
    _delete_all_records()
    sessions = (
        Session.objects.order_by("-started_at").prefetch_related("entries", "entries__toy").all()
    )

    for i, s in enumerate(sessions[::-1]):
        _calculate_sessions_records(RecordCheckCtx(list(sessions[len(sessions) - i :]), s))


def _check_record_by_key(ctx: RecordCheckCtx, key: str) -> bool | None:
    prev_record = ctx.session.records.filter(key__exact=key).first()
    result = RECORD_DEFINITIONS[key](ctx)
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


def _calculate_sessions_records(ctx: RecordCheckCtx) -> None:
    for key in RECORD_DEFINITIONS:
        _check_record_by_key(ctx, key)


def record_session(session: Session) -> None:
    sessions = (
        Session.objects.filter(started_at__lt=session.started_at)
        .prefetch_related("entries", "entries__toy")
        .all()
    )
    _calculate_sessions_records(RecordCheckCtx(list(sessions), session))


@record("pr-width")
def pr_width(ctx: RecordCheckCtx) -> RecordCheckResult | None:
    return _pr_field(
        ctx, SessionDimensions.peak_circumference_with_entry, lambda t: t.toy.circumference
    )


@record("pr-depth")
def pr_depth(ctx: RecordCheckCtx) -> RecordCheckResult | None:
    return _pr_field(
        ctx, SessionDimensions.peak_length_with_entry, lambda t: t.toy.insertable_length
    )
