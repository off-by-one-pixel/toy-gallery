from dataclasses import dataclass, field
from datetime import datetime, timedelta

from django.conf import settings


def session_media_window(
    started_at: datetime, ended_at: datetime | None = None
) -> tuple[datetime, datetime]:
    delta = timedelta(minutes=settings.SESSION_MEDIA_WINDOW_MINUTES)
    return started_at - delta, (ended_at or started_at) + delta


@dataclass(frozen=True)
class MediaCounts:
    photos: int
    videos: int


@dataclass(frozen=True)
class MediaResult:
    configured: bool
    authoritative: bool = False
    items: list[dict] = field(default_factory=list)
    share_url: str | None = None
    counts: dict[int, MediaCounts] = field(default_factory=dict)
    liked: bool = False
