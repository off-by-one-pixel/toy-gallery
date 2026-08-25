from datetime import UTC, datetime, timedelta
from unittest import mock

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from . import immich, media, models


def _response(status_code=200, json_data=None):
    resp = mock.Mock()
    resp.status_code = status_code
    resp.content = b"x" if json_data is not None else b""
    resp.json.return_value = json_data
    return resp


class SessionMediaWindowTests(TestCase):
    def test_window_is_symmetric_hour_by_default(self):
        started = datetime(2026, 6, 1, 20, 0, tzinfo=UTC)
        start, end = media.session_media_window(started)
        self.assertEqual(start, started - timedelta(minutes=60))
        self.assertEqual(end, started + timedelta(minutes=60))

    @override_settings(SESSION_MEDIA_WINDOW_MINUTES=15)
    def test_window_honours_configured_minutes(self):
        started = datetime(2026, 6, 1, 20, 0, tzinfo=UTC)
        start, end = media.session_media_window(started)
        self.assertEqual(end - start, timedelta(minutes=30))

    def test_window_extends_to_session_end_when_set(self):
        started = datetime(2026, 6, 1, 20, 0, tzinfo=UTC)
        ended = datetime(2026, 6, 2, 7, 30, tzinfo=UTC)
        start, end = media.session_media_window(started, ended)
        self.assertEqual(start, started - timedelta(minutes=60))
        self.assertEqual(end, ended + timedelta(minutes=60))

    def test_window_ignores_missing_end(self):
        started = datetime(2026, 6, 1, 20, 0, tzinfo=UTC)
        self.assertEqual(
            media.session_media_window(started, None),
            media.session_media_window(started),
        )


@override_settings(
    IMMICH_URL="https://immich", IMMICH_PUBLIC_URL="https://photos.example", IMMICH_API_KEY="k"
)
class ImmichClientTests(TestCase):
    def test_unconfigured_without_url_or_key(self):
        with override_settings(IMMICH_URL="", IMMICH_API_KEY=""):
            self.assertFalse(immich.ImmichClient().is_configured())

    @mock.patch("toys.immich.requests.request")
    def test_search_normalises_assets(self, request_mock):
        request_mock.return_value = _response(
            json_data={
                "assets": {
                    "items": [
                        {"id": "a1", "type": "IMAGE", "localDateTime": "2026-06-01T20:10:00"},
                        {"id": "a2", "type": "VIDEO", "fileCreatedAt": "2026-06-01T20:20:00"},
                    ]
                }
            }
        )
        start = datetime(2026, 6, 1, 19, 0, tzinfo=UTC)
        end = datetime(2026, 6, 1, 21, 0, tzinfo=UTC)
        assets = immich.ImmichClient().search_assets(start, end)
        self.assertEqual(
            [(a.id, a.kind, a.taken_at) for a in assets],
            [
                ("a1", "image", "2026-06-01T20:10:00"),
                ("a2", "video", "2026-06-01T20:20:00"),
            ],
        )
        body = request_mock.call_args.kwargs["json"]
        self.assertIn("takenAfter", body)
        self.assertIn("takenBefore", body)

    @mock.patch("toys.immich.requests.request")
    def test_ensure_shared_link_reuses_matching_unexpired_link(self, request_mock):
        marker = immich._link_marker(7, ["a1", "a2"])
        request_mock.return_value = _response(
            json_data=[
                {
                    "id": "l1",
                    "key": "K1",
                    "description": marker,
                    "expiresAt": "2999-01-01T00:00:00Z",
                },
            ]
        )
        key = immich.ImmichClient().ensure_shared_link(7, ["a2", "a1"])
        self.assertEqual(key, "K1")
        self.assertEqual(request_mock.call_count, 1)

    @mock.patch("toys.immich.requests.request")
    def test_ensure_shared_link_replaces_stale_set(self, request_mock):
        stale_marker = immich._link_marker(7, ["old"])
        request_mock.side_effect = [
            _response(
                json_data=[
                    {"id": "l1", "key": "K1", "description": stale_marker, "expiresAt": None}
                ]
            ),
            _response(status_code=204),
            _response(json_data={"key": "K2"}),
        ]
        key = immich.ImmichClient().ensure_shared_link(7, ["a1"])
        self.assertEqual(key, "K2")
        delete_call = request_mock.call_args_list[1]
        self.assertEqual(delete_call.args[0], "DELETE")
        self.assertIn("/shared-links/l1", delete_call.args[1])
        create_call = request_mock.call_args_list[2]
        self.assertEqual(create_call.args[0], "POST")
        self.assertEqual(create_call.kwargs["json"]["assetIds"], ["a1"])
        self.assertIn("expiresAt", create_call.kwargs["json"])

    def test_asset_urls_use_public_base_and_key(self):
        client = immich.ImmichClient()
        image = immich.MediaAsset(id="a1", kind="image", taken_at=None, instant=None)
        video = immich.MediaAsset(id="a2", kind="video", taken_at=None, instant=None)
        thumb, full = client.asset_urls(image, "KEY")
        self.assertEqual(thumb, "https://photos.example/api/assets/a1/thumbnail?size=thumbnail&key=KEY")
        self.assertEqual(full, "https://photos.example/api/assets/a1/thumbnail?size=preview&key=KEY")
        _, video_url = client.asset_urls(video, "KEY")
        self.assertEqual(video_url, "https://photos.example/api/assets/a2/video/playback?key=KEY")


@override_settings(
    IMMICH_URL="https://immich", IMMICH_PUBLIC_URL="https://immich", IMMICH_API_KEY="k"
)
class MediaIndicatorTests(TestCase):
    def setUp(self):
        user = User.objects.create_user(username="u", password="p")
        self.client = APIClient()
        self.client.force_authenticate(user=user)

    def test_media_status_reports_configured(self):
        response = self.client.get("/toys/sessions/media-status/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"configured": True})

    def test_media_status_reports_unconfigured(self):
        with override_settings(IMMICH_URL="", IMMICH_API_KEY=""):
            response = self.client.get("/toys/sessions/media-status/")
        self.assertEqual(response.data, {"configured": False})

    def test_session_serializer_exposes_counts(self):
        flagged = models.Session.objects.create(
            started_at="2026-06-01T20:00:00Z", photo_count=2, video_count=1
        )
        response = self.client.get(f"/toys/sessions/{flagged.id}/")
        self.assertEqual(response.data["photo_count"], 2)
        self.assertEqual(response.data["video_count"], 1)

    @mock.patch("toys.immich.requests.request")
    def test_empty_search_clears_stale_session_links(self, request_mock):
        session = models.Session.objects.create(started_at="2026-06-01T20:00:00Z")
        request_mock.side_effect = [
            _response(json_data={"assets": {"items": []}}),
            _response(
                json_data=[
                    {
                        "id": "l1",
                        "key": "K",
                        "description": immich._link_marker(session.id, ["gone"]),
                    }
                ]
            ),
            _response(status_code=204),
        ]
        session.photo_count = 1
        session.save(update_fields=["photo_count"])
        response = self.client.get(f"/toys/sessions/{session.id}/media/")
        self.assertEqual(response.data, {"configured": True, "items": [], "share_url": None})
        delete_call = request_mock.call_args_list[2]
        self.assertEqual(delete_call.args[0], "DELETE")
        self.assertIn("/shared-links/l1", delete_call.args[1])
        session.refresh_from_db()
        self.assertEqual(session.photo_count, 0)
        self.assertEqual(session.video_count, 0)


@override_settings(
    IMMICH_URL="https://immich", IMMICH_PUBLIC_URL="https://immich", IMMICH_API_KEY="k"
)
class RefreshAllMediaTests(TestCase):
    def setUp(self):
        user = User.objects.create_user(username="u", password="p")
        self.client = APIClient()
        self.client.force_authenticate(user=user)

    @mock.patch("toys.immich.requests.request")
    def test_buckets_assets_creates_links_and_cleans_empty_sessions(self, request_mock):
        with_media = models.Session.objects.create(started_at="2026-06-01T20:00:00Z")
        without_media = models.Session.objects.create(started_at="2026-06-05T09:00:00Z")
        request_mock.side_effect = [
            _response(
                json_data={
                    "assets": {
                        "items": [
                            {"id": "a1", "type": "IMAGE", "fileCreatedAt": "2026-06-01T20:15:00Z"},
                            {"id": "a2", "type": "VIDEO", "fileCreatedAt": "2026-06-01T20:20:00Z"},
                        ]
                    }
                }
            ),
            _response(
                json_data=[
                    {
                        "id": "stale",
                        "key": "K",
                        "description": immich._link_marker(without_media.id, ["gone"]),
                    },
                ]
            ),
            _response(json_data={"key": "NEW"}),
            _response(status_code=204),
        ]
        without_media.photo_count = 3
        without_media.save(update_fields=["photo_count"])
        response = self.client.post("/toys/sessions/refresh-media/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"configured": True, "sessions_with_media": 1})
        with_media.refresh_from_db()
        without_media.refresh_from_db()
        self.assertEqual((with_media.photo_count, with_media.video_count), (1, 1))
        self.assertEqual((without_media.photo_count, without_media.video_count), (0, 0))
        create_call = request_mock.call_args_list[2]
        self.assertEqual(create_call.args[0], "POST")
        self.assertIn("/shared-links", create_call.args[1])
        self.assertEqual(create_call.kwargs["json"]["assetIds"], ["a1", "a2"])
        delete_call = request_mock.call_args_list[3]
        self.assertEqual(delete_call.args[0], "DELETE")
        self.assertIn("/shared-links/stale", delete_call.args[1])

    @mock.patch("toys.immich.requests.request")
    def test_keeps_matching_unexpired_link_without_creating(self, request_mock):
        session = models.Session.objects.create(started_at="2026-06-01T20:00:00Z")
        request_mock.side_effect = [
            _response(
                json_data={
                    "assets": {
                        "items": [
                            {"id": "a1", "type": "IMAGE", "fileCreatedAt": "2026-06-01T20:15:00Z"}
                        ]
                    }
                }
            ),
            _response(
                json_data=[
                    {
                        "id": "l1",
                        "key": "K",
                        "description": immich._link_marker(session.id, ["a1"]),
                        "expiresAt": "2999-01-01T00:00:00Z",
                    }
                ]
            ),
        ]
        response = self.client.post("/toys/sessions/refresh-media/")
        self.assertEqual(response.data, {"configured": True, "sessions_with_media": 1})
        self.assertEqual(request_mock.call_count, 2)

    @mock.patch("toys.immich.requests.request")
    def test_keyless_create_response_degrades_to_empty(self, request_mock):
        models.Session.objects.create(started_at="2026-06-01T20:00:00Z")
        request_mock.side_effect = [
            _response(
                json_data={
                    "assets": {
                        "items": [
                            {"id": "a1", "type": "IMAGE", "fileCreatedAt": "2026-06-01T20:15:00Z"}
                        ]
                    }
                }
            ),
            _response(json_data=[]),
            _response(status_code=204),
        ]
        response = self.client.post("/toys/sessions/refresh-media/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"configured": True, "sessions_with_media": 0})

    @mock.patch("toys.immich.ImmichClient.search_assets", side_effect=immich.ImmichError("boom"))
    def test_upstream_failure_does_not_clear_stored_counts(self, _search_mock):
        flagged = models.Session.objects.create(
            started_at="2026-06-01T20:00:00Z", photo_count=2, video_count=1
        )
        response = self.client.post("/toys/sessions/refresh-media/")
        self.assertEqual(response.data, {"configured": True, "sessions_with_media": 0})
        flagged.refresh_from_db()
        self.assertEqual((flagged.photo_count, flagged.video_count), (2, 1))


class SessionMediaEndpointTests(TestCase):
    def setUp(self):
        user = User.objects.create_user(username="u", password="p")
        self.client = APIClient()
        self.client.force_authenticate(user=user)
        self.session = models.Session.objects.create(started_at="2026-06-01T20:00:00Z")

    @override_settings(IMMICH_URL="", IMMICH_API_KEY="")
    def test_unconfigured_returns_flag_and_no_items(self):
        response = self.client.get(f"/toys/sessions/{self.session.id}/media/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"configured": False, "items": [], "share_url": None})

    @override_settings(IMMICH_URL="https://immich", IMMICH_API_KEY="k")
    @mock.patch("toys.immich.ImmichClient.clear_session_links")
    @mock.patch("toys.immich.ImmichClient.search_assets", return_value=[])
    def test_search_window_extends_to_session_end(self, search_mock, _clear_mock):
        self.session.ended_at = datetime(2026, 6, 2, 7, 30, tzinfo=UTC)
        self.session.save(update_fields=["ended_at"])
        self.session.refresh_from_db()
        response = self.client.get(f"/toys/sessions/{self.session.id}/media/")
        self.assertEqual(response.status_code, 200)
        start, end = search_mock.call_args.args
        self.assertEqual(start, self.session.started_at - timedelta(minutes=60))
        self.assertEqual(end, self.session.ended_at + timedelta(minutes=60))

    @override_settings(
        IMMICH_URL="https://immich", IMMICH_PUBLIC_URL="https://immich", IMMICH_API_KEY="k"
    )
    @mock.patch("toys.immich.ImmichClient.ensure_shared_link", return_value="KEY")
    @mock.patch("toys.immich.ImmichClient.search_assets")
    def test_returns_items_with_keyed_urls(self, search_mock, _link_mock):
        search_mock.return_value = [
            immich.MediaAsset(id="a1", kind="image", taken_at="2026-06-01T20:10:00", instant=None)
        ]
        response = self.client.get(f"/toys/sessions/{self.session.id}/media/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["configured"])
        self.assertEqual(set(response.data.keys()), {"configured", "items", "share_url"})
        self.assertEqual(response.data["share_url"], "https://immich/share/KEY")
        item = response.data["items"][0]
        self.assertEqual(item["id"], "a1")
        self.assertIn("key=KEY", item["thumbnail_url"])
        self.assertIn("key=KEY", item["full_url"])
        self.session.refresh_from_db()
        self.assertEqual((self.session.photo_count, self.session.video_count), (1, 0))

    @override_settings(IMMICH_URL="https://immich", IMMICH_API_KEY="k")
    @mock.patch("toys.immich.ImmichClient.search_assets", side_effect=immich.ImmichError("boom"))
    def test_upstream_failure_degrades_to_empty_and_keeps_counts(self, _search_mock):
        self.session.photo_count = 1
        self.session.save(update_fields=["photo_count"])
        response = self.client.get(f"/toys/sessions/{self.session.id}/media/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"configured": True, "items": [], "share_url": None})
        self.session.refresh_from_db()
        self.assertEqual((self.session.photo_count, self.session.video_count), (1, 0))
