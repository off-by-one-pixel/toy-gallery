import hashlib
import logging
from datetime import datetime, timedelta

import requests
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

LINK_MARKER_PREFIX = "toy-gallery"
REQUEST_TIMEOUT_S = 10
REUSE_MIN_REMAINING = timedelta(minutes=30)
SEARCH_PAGE_SIZE = 200
MAX_SEARCH_PAGES = 10


def session_media_window(started_at: datetime) -> tuple[datetime, datetime]:
    delta = timedelta(minutes=settings.SESSION_MEDIA_WINDOW_MINUTES)
    return started_at - delta, started_at + delta


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
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


class ImmichError(Exception):
    pass


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

    def search_assets(self, start: datetime, end: datetime) -> list[dict]:
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
        return [
            {
                "id": a["id"],
                "kind": "video" if a.get("type") == "VIDEO" else "image",
                "taken_at": a.get("localDateTime") or a.get("fileCreatedAt"),
                "instant": _parse_instant(a.get("fileCreatedAt") or a.get("localDateTime")),
            }
            for a in items
        ]

    def ensure_shared_link(self, session_id: int, asset_ids: list[str]) -> str:
        marker = _link_marker(session_id, asset_ids)
        session_prefix = _session_marker_prefix(session_id)
        reusable_key = None
        stale_link_ids = []

        for link in self._request("GET", "/shared-links") or []:
            description = link.get("description") or ""
            if not description.startswith(session_prefix):
                continue
            if reusable_key is None and description == marker and self._has_remaining_life(link):
                reusable_key = link["key"]
            else:
                stale_link_ids.append(link["id"])

        for link_id in stale_link_ids:
            self._delete_link(link_id)

        if reusable_key is not None:
            return reusable_key
        return self._create_link(marker, asset_ids)

    def _create_link(self, marker: str, asset_ids: list[str]) -> str:
        expires_at = timezone.now() + timedelta(hours=settings.SESSION_MEDIA_LINK_HOURS)
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
        return created["key"]

    def _delete_link(self, link_id: str) -> None:
        try:
            self._request("DELETE", f"/shared-links/{link_id}")
        except ImmichError:
            logger.warning("immich: failed to delete stale shared link %s", link_id)

    def _has_remaining_life(self, link: dict) -> bool:
        expires_at = link.get("expiresAt")
        if not expires_at:
            return True
        parsed = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
        return parsed - timezone.now() >= REUSE_MIN_REMAINING

    def sessions_with_media(self) -> list[int]:
        ids = set()
        for link in self._request("GET", "/shared-links") or []:
            session_id = _marker_session_id(link.get("description") or "")
            if session_id is not None:
                ids.add(session_id)
        return sorted(ids)

    def clear_session_links(self, session_id: int) -> None:
        prefix = _session_marker_prefix(session_id)
        for link in self._request("GET", "/shared-links") or []:
            if (link.get("description") or "").startswith(prefix):
                try:
                    self._request("DELETE", f"/shared-links/{link['id']}")
                except ImmichError:
                    logger.warning("immich: failed to delete stale shared link %s", link["id"])

    def asset_urls(self, asset: dict, key: str) -> tuple[str, str]:
        base = f"{self.public_url}/api/assets/{asset['id']}"
        thumbnail = f"{base}/thumbnail?size=thumbnail&key={key}"
        if asset["kind"] == "video":
            return thumbnail, f"{base}/video/playback?key={key}"
        return thumbnail, f"{base}/thumbnail?size=preview&key={key}"


def refresh_all_media(sessions: list[tuple[int, datetime]]) -> dict:
    client = ImmichClient()
    if not client.is_configured():
        return {"configured": False, "session_ids": []}
    try:
        windows = {sid: session_media_window(started) for sid, started in sessions}
        if not windows:
            return {"configured": True, "session_ids": []}

        overall_start = min(w[0] for w in windows.values())
        overall_end = max(w[1] for w in windows.values())
        assets = client.search_assets(overall_start, overall_end)

        per_session: dict[int, list[str]] = {sid: [] for sid in windows}
        for asset in assets:
            instant = asset["instant"]
            if instant is None:
                continue
            for sid, (window_start, window_end) in windows.items():
                if window_start <= instant <= window_end:
                    per_session[sid].append(asset["id"])

        links = client._request("GET", "/shared-links") or []
        links_by_session: dict[int, list[dict]] = {}
        for link in links:
            sid = _marker_session_id(link.get("description") or "")
            if sid is not None:
                links_by_session.setdefault(sid, []).append(link)

        session_ids = []
        for sid, asset_ids in per_session.items():
            existing = links_by_session.pop(sid, [])
            if not asset_ids:
                for link in existing:
                    client._delete_link(link["id"])
                continue
            session_ids.append(sid)
            marker = _link_marker(sid, asset_ids)
            keep_found = False
            for link in existing:
                matches = link.get("description") == marker and client._has_remaining_life(link)
                if not keep_found and matches:
                    keep_found = True
                else:
                    client._delete_link(link["id"])
            if not keep_found:
                client._create_link(marker, asset_ids)

        return {"configured": True, "session_ids": sorted(session_ids)}
    except (ImmichError, requests.RequestException) as err:
        logger.warning("immich: media refresh failed: %s", err)
        return {"configured": True, "session_ids": []}


def media_indicators() -> dict:
    client = ImmichClient()
    if not client.is_configured():
        return {"configured": False, "session_ids": []}
    try:
        return {"configured": True, "session_ids": client.sessions_with_media()}
    except (ImmichError, requests.RequestException) as err:
        logger.warning("immich: indicator lookup failed: %s", err)
        return {"configured": True, "session_ids": []}


def session_media(session_id: int, started_at: datetime) -> dict:
    client = ImmichClient()
    if not client.is_configured():
        return {"configured": False, "items": []}
    try:
        start, end = session_media_window(started_at)
        assets = client.search_assets(start, end)
        if not assets:
            client.clear_session_links(session_id)
            return {"configured": True, "items": []}
        key = client.ensure_shared_link(session_id, [a["id"] for a in assets])
        items = []
        for asset in assets:
            thumbnail_url, full_url = client.asset_urls(asset, key)
            items.append(
                {
                    "id": asset["id"],
                    "kind": asset["kind"],
                    "taken_at": asset["taken_at"],
                    "thumbnail_url": thumbnail_url,
                    "full_url": full_url,
                }
            )
        return {"configured": True, "items": items}
    except (ImmichError, requests.RequestException) as err:
        logger.warning("immich: media lookup failed: %s", err)
        return {"configured": True, "items": []}
