from datetime import UTC, datetime

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from . import models
from .tests import _payload

URL = "/toys/sessions/"


def _utc(iso: str) -> datetime:
    return datetime.fromisoformat(iso).replace(tzinfo=UTC)


class SessionListTests(TestCase):
    def setUp(self):
        user = User.objects.create_user(username="u", password="p")
        self.client = APIClient()
        self.client.force_authenticate(user=user)

    def _create_toy(self, name, insertable_length=None, circumference=None):
        payload = _payload(section_circumferences=(None, 220.0, None))
        payload["name"] = name
        if insertable_length is not None:
            payload["insertable_length"] = insertable_length
        if circumference is not None:
            payload["circumference"] = circumference
        response = self.client.post("/toys/toys/", payload, format="json")
        self.assertEqual(response.status_code, 201, response.content)
        return response.data["id"]

    def _make_session(self, started_at, entries=()):
        session = models.Session.objects.create(started_at=started_at)
        for entry in entries:
            models.ToySessionEntry.objects.create(
                session=session,
                toy_id=entry["toy"],
                involvement=entry.get("involvement", "USED"),
                duration_minutes=entry.get("duration_minutes"),
            )
        return session

    def _get(self, **params):
        response = self.client.get(URL, params)
        self.assertEqual(response.status_code, 200, response.content)
        return response.data

    def test_list_returns_paginated_envelope(self):
        for hour in (8, 9, 10):
            self._make_session(_utc(f"2026-06-01T{hour:02d}:00:00"))
        data = self._get()
        self.assertEqual(set(data.keys()), {"count", "next", "previous", "results"})
        self.assertEqual(data["count"], 3)
        self.assertIsNone(data["next"])
        self.assertEqual(len(data["results"]), 3)

    def test_pages_traverse_with_stable_tie_broken_order(self):
        same_moment = _utc("2026-06-01T10:00:00")
        ids = [self._make_session(same_moment).id for _ in range(21)]
        first = self._get()
        self.assertEqual(len(first["results"]), 20)
        self.assertIsNotNone(first["next"])
        second = self._get(page=2)
        self.assertEqual(len(second["results"]), 1)
        self.assertIsNotNone(second["previous"])
        seen = [s["id"] for s in first["results"]] + [s["id"] for s in second["results"]]
        self.assertEqual(seen, sorted(ids, reverse=True))

    def test_start_filter_follows_timezone(self):
        session = self._make_session(_utc("2026-06-08T02:00:00"))
        utc = self._get(start="2026-06-08")
        self.assertEqual([s["id"] for s in utc["results"]], [session.id])
        ny = self._get(start="2026-06-08", tz="America/New_York")
        self.assertEqual(ny["results"], [])

    def test_end_filter_is_inclusive_local_day(self):
        included = self._make_session(_utc("2026-06-07T23:59:00"))
        self._make_session(_utc("2026-06-08T00:01:00"))
        data = self._get(end="2026-06-07")
        self.assertEqual([s["id"] for s in data["results"]], [included.id])

    def test_orders_by_duration_with_nulls_last(self):
        toy = self._create_toy("D")
        short = self._make_session(
            _utc("2026-06-01T08:00:00"), [{"toy": toy, "duration_minutes": 30}]
        )
        long = self._make_session(
            _utc("2026-06-01T09:00:00"), [{"toy": toy, "duration_minutes": 65}]
        )
        none = self._make_session(_utc("2026-06-01T10:00:00"), [{"toy": toy}])
        asc = self._get(ordering="duration")
        self.assertEqual([s["id"] for s in asc["results"]], [short.id, long.id, none.id])
        desc = self._get(ordering="-duration")
        self.assertEqual([s["id"] for s in desc["results"]], [long.id, short.id, none.id])

    def test_orders_by_peak_length_and_circumference(self):
        small = self._create_toy("S", insertable_length=100, circumference=90)
        big = self._create_toy("B", insertable_length=200, circumference=150)
        s_small = self._make_session(
            _utc("2026-06-01T08:00:00"), [{"toy": small, "involvement": "FULLY_INSERTED"}]
        )
        s_big = self._make_session(
            _utc("2026-06-01T09:00:00"), [{"toy": big, "involvement": "FULLY_INSERTED"}]
        )
        s_used = self._make_session(
            _utc("2026-06-01T10:00:00"), [{"toy": big, "involvement": "USED"}]
        )
        length = self._get(ordering="-length")
        self.assertEqual(
            [s["id"] for s in length["results"]], [s_big.id, s_small.id, s_used.id]
        )
        circumference = self._get(ordering="circumference")
        self.assertEqual(
            [s["id"] for s in circumference["results"]], [s_small.id, s_big.id, s_used.id]
        )

    def test_invalid_parameters_return_400(self):
        cases = [
            {"start": "2026-06-10", "end": "2026-06-01"},
            {"tz": "Not/AZone"},
            {"start": "junk"},
            {"ordering": "name"},
        ]
        for params in cases:
            response = self.client.get(URL, params)
            self.assertEqual(response.status_code, 400, params)

    def test_out_of_range_page_returns_404(self):
        self._make_session(_utc("2026-06-01T08:00:00"))
        response = self.client.get(URL, {"page": 99})
        self.assertEqual(response.status_code, 404)

    def test_detail_ignores_list_query_params(self):
        session = self._make_session(_utc("2026-06-01T08:00:00"))
        response = self.client.get(f"{URL}{session.id}/", {"tz": "Not/AZone"})
        self.assertEqual(response.status_code, 200)

    def test_toys_list_stays_a_plain_array(self):
        self._create_toy("Plain")
        response = self.client.get("/toys/toys/")
        self.assertIsInstance(response.data, list)
