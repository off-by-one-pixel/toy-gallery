import functools
import hashlib
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta

import requests
from django.conf import settings
from django.utils import timezone

from .media import (
    MediaCounts,
    MediaRefreshResult,
    SessionMediaProvider,
    SessionMediaResult,
    session_media_window,
)

logger = logging.getLogger(__name__)

LINK_MARKER_PREFIX = "toy-gallery"
REQUEST_TIMEOUT_S = 10
REUSE_MIN_REMAINING = timedelta(minutes=5)
SEARCH_PAGE_SIZE = 200
MAX_SEARCH_PAGES = 10


def _asset_set_hash(asset_ids: list[str]) -> str:
    return hashlib.sha256(",".join(sorted(asset_ids)).encode()).hexdigest()[:12]


def _link_marker(session_id: int, asset_ids: list[str]) -> str:
    return f"{LINK_MARKER_PREFIX}:{session_id}:{_asset_set_hash(asset_ids)}"


def _session_marker_prefix(session_id: int) -> str:
    return f"{LINK_MARKER_PREFIX}:{session_id}:"


def _marker_session_id(description: str) -> int | None:
    parts = description.split(":")
    if len(parts) != 3 or parts[0] != LINK_MARKER_PREFIX:
        return None
    try:
        return int(parts[1])
    except ValueError:
        return None


def _parse_instant(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


class ImmichError(Exception):
    pass


@dataclass(frozen=True)
class MediaAsset:
    id: str
    kind: str
    taken_at: str | None
    instant: datetime | None


@dataclass(frozen=True)
class SharedLink:
    id: str
    key: str
    description: str
    expires_at: datetime | None

    @property
    def session_id(self) -> int | None:
        return _marker_session_id(self.description)


def _parse_asset(raw: dict) -> MediaAsset:
    return MediaAsset(
        id=raw["id"],
        kind="video" if raw.get("type") == "VIDEO" else "image",
        taken_at=raw.get("localDateTime") or raw.get("fileCreatedAt"),
        instant=_parse_instant(raw.get("fileCreatedAt") or raw.get("localDateTime")),
    )


def _parse_link(raw: dict) -> SharedLink:
    return SharedLink(
        id=raw["id"],
        key=raw.get("key") or "",
        description=raw.get("description") or "",
        expires_at=_parse_instant(raw.get("expiresAt")),
    )


class ImmichClient:
    def __init__(self):
        self.base_url = settings.IMMICH_URL
        self.public_url = settings.IMMICH_PUBLIC_URL
        self.api_key = settings.IMMICH_API_KEY

    def is_configured(self) -> bool:
        return bool(self.base_url and self.api_key)

    def _request(self, method: str, path: str, **kwargs):
        response = requests.request(
            method,
            f"{self.base_url}/api{path}",
            headers={"x-api-key": self.api_key, "Accept": "application/json"},
            timeout=REQUEST_TIMEOUT_S,
            **kwargs,
        )
        if response.status_code >= 400:
            raise ImmichError(f"{method} {path} -> {response.status_code}")
        if response.status_code == 204 or not response.content:
            return None
        return response.json()

    def search_assets(self, start: datetime, end: datetime) -> list[MediaAsset]:
        items = []
        page = 1
        while page and page <= MAX_SEARCH_PAGES:
            body = {
                "takenAfter": start.isoformat(),
                "takenBefore": end.isoformat(),
                "size": SEARCH_PAGE_SIZE,
                "page": page,
            }
            data = self._request("POST", "/search/metadata", json=body)
            chunk = (data or {}).get("assets", {})
            items.extend(chunk.get("items", []))
            next_page = chunk.get("nextPage")
            page = int(next_page) if next_page else None
        return [_parse_asset(a) for a in items]

    def shared_links(self) -> list[SharedLink]:
        return [_parse_link(raw) for raw in self._request("GET", "/shared-links") or []]

    def ensure_shared_link(self, session_id: int, asset_ids: list[str]) -> str:
        marker = _link_marker(session_id, asset_ids)
        session_prefix = _session_marker_prefix(session_id)
        reusable_key = None
        stale_link_ids = []

        for link in self.shared_links():
            if not link.description.startswith(session_prefix):
                continue
            matches = link.description == marker and self._has_remaining_life(link)
            if reusable_key is None and matches:
                reusable_key = link.key
            else:
                stale_link_ids.append(link.id)

        for link_id in stale_link_ids:
            self._delete_link(link_id)

        if reusable_key is not None:
            return reusable_key
        return self._create_link(marker, asset_ids)

    def _create_link(self, marker: str, asset_ids: list[str]) -> str:
        expires_at = timezone.now() + timedelta(minutes=settings.SESSION_MEDIA_LINK_MINUTES)
        created = self._request(
            "POST",
            "/shared-links",
            json={
                "type": "INDIVIDUAL",
                "assetIds": asset_ids,
                "description": marker,
                "expiresAt": expires_at.isoformat(),
                "allowDownload": True,
                "showMetadata": False,
            },
        )
        key = (created or {}).get("key")
        if not key:
            raise ImmichError("shared link creation returned no key")
        return key

    def _delete_link(self, link_id: str) -> None:
        try:
            self._request("DELETE", f"/shared-links/{link_id}")
        except ImmichError:
            logger.warning("immich: failed to delete stale shared link %s", link_id)

    def _has_remaining_life(self, link: SharedLink) -> bool:
        if link.expires_at is None:
            return True
        return link.expires_at - timezone.now() >= REUSE_MIN_REMAINING

    def clear_session_links(self, session_id: int) -> None:
        prefix = _session_marker_prefix(session_id)
        for link in self.shared_links():
            if link.description.startswith(prefix):
                self._delete_link(link.id)

    def share_url(self, key: str) -> str:
        return f"{self.public_url}/share/{key}"

    def asset_urls(self, asset: MediaAsset, key: str) -> tuple[str, str]:
        base = f"{self.public_url}/api/assets/{asset.id}"
        thumbnail = f"{base}/thumbnail?size=thumbnail&key={key}"
        if asset.kind == "video":
            return thumbnail, f"{base}/video/playback?key={key}"
        return thumbnail, f"{base}/thumbnail?size=preview&key={key}"


def _assets_by_session(
    assets: list[MediaAsset], windows: dict[int, tuple[datetime, datetime]]
) -> dict[int, list[MediaAsset]]:
    per_session: dict[int, list[MediaAsset]] = {sid: [] for sid in windows}
    for asset in assets:
        if asset.instant is None:
            continue
        for sid, (window_start, window_end) in windows.items():
            if window_start <= asset.instant <= window_end:
                per_session[sid].append(asset)
    return per_session


def _media_counts(session_assets: list[MediaAsset]) -> MediaCounts:
    videos = sum(1 for asset in session_assets if asset.kind == "video")
    return MediaCounts(photos=len(session_assets) - videos, videos=videos)


def _links_by_session(links: list[SharedLink]) -> dict[int, list[SharedLink]]:
    by_session: dict[int, list[SharedLink]] = {}
    for link in links:
        if link.session_id is not None:
            by_session.setdefault(link.session_id, []).append(link)
    return by_session


def _media_operation(unconfigured, degraded):
    def wrap(fn):
        @functools.wraps(fn)
        def guarded(self, *args, **kwargs):
            if not self.client.is_configured():
                return unconfigured
            try:
                return fn(self, *args, **kwargs)
            except (ImmichError, requests.RequestException) as err:
                logger.warning("immich: %s failed: %s", fn.__name__, err)
                return degraded
        return guarded
    return wrap


UNCONFIGURED_REFRESH = MediaRefreshResult(configured=False, authoritative=False, counts={})
DEGRADED_REFRESH = MediaRefreshResult(configured=True, authoritative=False, counts={})
UNCONFIGURED_MEDIA = SessionMediaResult(configured=False, authoritative=False, items=[])
DEGRADED_MEDIA = SessionMediaResult(configured=True, authoritative=False, items=[])


class ImmichMediaProvider(SessionMediaProvider):
    def __init__(self):
        self.client = ImmichClient()

    def is_configured(self) -> bool:
        return self.client.is_configured()

    @_media_operation(UNCONFIGURED_REFRESH, DEGRADED_REFRESH)
    def refresh_all_media(
        self, sessions: list[tuple[int, datetime, datetime | None]]
    ) -> MediaRefreshResult:
        windows = {sid: session_media_window(started, ended) for sid, started, ended in sessions}
        if not windows:
            return MediaRefreshResult(configured=True, authoritative=True, counts={})

        overall_start = min(w[0] for w in windows.values())
        overall_end = max(w[1] for w in windows.values())
        assets = self.client.search_assets(overall_start, overall_end)
        links_by_session = _links_by_session(self.client.shared_links())

        counts: dict[int, MediaCounts] = {}
        for sid, session_assets in sorted(_assets_by_session(assets, windows).items()):
            asset_ids = [asset.id for asset in session_assets]
            if self._sync_session_links(sid, asset_ids, links_by_session.get(sid, [])):
                counts[sid] = _media_counts(session_assets)
        return MediaRefreshResult(configured=True, authoritative=True, counts=counts)

    def _sync_session_links(
        self, session_id: int, asset_ids: list[str], existing: list[SharedLink]
    ) -> bool:
        if not asset_ids:
            for link in existing:
                self.client._delete_link(link.id)
            return False
        marker = _link_marker(session_id, asset_ids)
        keep_found = False
        for link in existing:
            matches = link.description == marker and self.client._has_remaining_life(link)
            if not keep_found and matches:
                keep_found = True
            else:
                self.client._delete_link(link.id)
        if not keep_found:
            self.client._create_link(marker, asset_ids)
        return True

    @_media_operation(UNCONFIGURED_MEDIA, DEGRADED_MEDIA)
    def session_media(
        self, session_id: int, started_at: datetime, ended_at: datetime | None
    ) -> SessionMediaResult:
        start, end = session_media_window(started_at, ended_at)
        assets = self.client.search_assets(start, end)
        if not assets:
            self.client.clear_session_links(session_id)
            return SessionMediaResult(configured=True, authoritative=True, items=[])
        key = self.client.ensure_shared_link(session_id, [a.id for a in assets])
        items = [self._media_item(asset, key) for asset in assets]
        return SessionMediaResult(
            configured=True,
            authoritative=True,
            items=items,
            share_url=self.client.share_url(key),
        )

    def _media_item(self, asset: MediaAsset, key: str) -> dict:
        thumbnail_url, full_url = self.client.asset_urls(asset, key)
        return {
            "id": asset.id,
            "kind": asset.kind,
            "taken_at": asset.taken_at,
            "thumbnail_url": thumbnail_url,
            "full_url": full_url,
        }
