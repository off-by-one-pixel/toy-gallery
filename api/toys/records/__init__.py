from dataclasses import dataclass
from typing import Protocol

from toys.models import PersonalRecord, Session, Toy, ToySessionEntry


class DuplicateRecordKey(Exception):
    pass


@dataclass(frozen=True)
class RecordCheckResult:
    session: Session
    entry: ToySessionEntry
    toy: Toy | None
    value: float


@dataclass(frozen=True)
class SessionRecordCheckCtx:
    sessions: list[Session]
    session: Session


@dataclass(frozen=True)
class ToyRecordCheckCtx:
    sessions: list[Session]
    entry: ToySessionEntry


class SessionRecordCheck(Protocol):
    def __call__(self, ctx: SessionRecordCheckCtx) -> RecordCheckResult | None: ...


class ToyRecordCheck(Protocol):
    def __call__(self, ctx: ToyRecordCheckCtx) -> RecordCheckResult | None: ...


SESSION_RECORD_DEFINITIONS: dict[str, SessionRecordCheck] = {}
TOY_RECORD_DEFINITIONS: dict[str, ToyRecordCheck] = {}


def _register(register, key, check) -> None:  # pyright: ignore[reportUnusedFunction]
    if key in list(SESSION_RECORD_DEFINITIONS.keys()) + list(TOY_RECORD_DEFINITIONS.keys()):
        raise DuplicateRecordKey(key)
    register[key] = check


def _save_record(key: str, record: RecordCheckResult) -> None:
    PersonalRecord(
        key=key, toy=record.toy, session=record.session, toy_entry=record.entry, value=record.value
    ).save()


def _delete_record(record: PersonalRecord):
    record.delete()
