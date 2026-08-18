from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timedelta

from django.conf import settings


def session_media_window(started_at: datetime) -> tuple[datetime, datetime]:
    delta = timedelta(minutes=settings.SESSION_MEDIA_WINDOW_MINUTES)
    return started_at - delta, started_at + delta


@dataclass(frozen=True)
class SessionMediaResult:
    configured: bool
    authoritative: bool
    items: list[dict]


@dataclass(frozen=True)
class MediaRefreshResult:
    configured: bool
    authoritative: bool
    session_ids: list[int]


class SessionMediaProvider(ABC):
    @abstractmethod
    def is_configured(self) -> bool: ...

    @abstractmethod
    def session_media(self, session_id: int, started_at: datetime) -> SessionMediaResult: ...

    @abstractmethod
    def refresh_all_media(self, sessions: list[tuple[int, datetime]]) -> MediaRefreshResult: ...


def get_provider() -> SessionMediaProvider:
    from .immich import ImmichMediaProvider

    return ImmichMediaProvider()
