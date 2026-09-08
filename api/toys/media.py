from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timedelta

from django.conf import settings


def session_media_window(
    started_at: datetime, ended_at: datetime | None = None
) -> tuple[datetime, datetime]:
    delta = timedelta(minutes=settings.SESSION_MEDIA_WINDOW_MINUTES)
    return started_at - delta, (ended_at or started_at) + delta


@dataclass(frozen=True)
class SessionMediaResult:
    configured: bool
    authoritative: bool
    items: list[dict]
    share_url: str | None = None


@dataclass(frozen=True)
class MediaCounts:
    photos: int
    videos: int


@dataclass(frozen=True)
class MediaRefreshResult:
    configured: bool
    authoritative: bool
    counts: dict[int, MediaCounts]


@dataclass(frozen=True)
class MediaLikeResult:
    configured: bool
    authoritative: bool
    liked: bool


class SessionMediaProvider(ABC):
    @abstractmethod
    def is_configured(self) -> bool: ...

    @abstractmethod
    def session_media(
        self, session_id: int, started_at: datetime, ended_at: datetime | None
    ) -> SessionMediaResult: ...

    @abstractmethod
    def refresh_all_media(
        self, sessions: list[tuple[int, datetime, datetime | None]]
    ) -> MediaRefreshResult: ...

    @abstractmethod
    def set_media_liked(self, asset_id: str, liked: bool) -> MediaLikeResult: ...

    @abstractmethod
    def likes_configured(self) -> bool: ...


def get_provider() -> SessionMediaProvider:
    from .immich import ImmichMediaProvider

    return ImmichMediaProvider()
