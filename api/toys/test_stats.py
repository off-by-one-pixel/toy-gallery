from datetime import UTC, datetime

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from . import models
from .tests import _payload

URL = "/toys/sessions/stats/"


def _utc(iso: str) -> datetime:
    return datetime.fromisoformat(iso).replace(tzinfo=UTC)


class SessionStatsTestBase(TestCase):
    def setUp(self):
        user = User.objects.create_user(username="u", password="p")
        self.client = APIClient()
        self.client.force_authenticate(user=user)
        self.toy_a = self._create_toy("A")
        self.toy_b = self._create_toy("B")

    def _create_toy(self, name):
        payload = _payload(section_circumferences=(None, 220.0, None))
        payload["name"] = name
        response = self.client.post("/toys/toys/", payload, format="json")
        self.assertEqual(response.status_code, 201, response.content)
        return response.data["id"]

    def _make_session(self, started_at, entries=()):
        session = models.Session.objects.create(started_at=started_at)
        for entry in entries:
            models.ToySessionEntry.objects.create(
                session=session,
                toy_id=entry.get("toy", self.toy_a),
                involvement=entry.get("involvement", "USED"),
                duration_minutes=entry.get("duration_minutes"),
            )
        return session

    def _get(self, **params):
        response = self.client.get(URL, params)
        self.assertEqual(response.status_code, 200, response.content)
        return response.data["groups"]


class SessionStatsTests(SessionStatsTestBase):
    def test_empty_database_returns_no_groups(self):
        self.assertEqual(self._get(group_by="date", metrics="count"), [])

    def test_counts_group_by_local_date(self):
        self._make_session(_utc("2026-06-01T10:00:00"))
        self._make_session(_utc("2026-06-01T22:00:00"))
        self._make_session(_utc("2026-06-02T01:00:00"))
        groups = self._get(group_by="date", metrics="count")
        self.assertEqual(
            groups,
            [
                {"key": "2026-06-01", "values": {"count": 2}},
                {"key": "2026-06-02", "values": {"count": 1}},
            ],
        )

    def test_timezone_shifts_date_hour_and_weekday(self):
        self._make_session(_utc("2026-01-01T00:30:00"))
        ny_date = self._get(group_by="date", metrics="count", tz="America/New_York")
        self.assertEqual(ny_date[0]["key"], "2025-12-31")
        utc_date = self._get(group_by="date", metrics="count")
        self.assertEqual(utc_date[0]["key"], "2026-01-01")
        ny_hour = self._get(group_by="hour", metrics="count", tz="America/New_York")
        self.assertEqual(ny_hour[0]["key"], "19")
        ny_weekday = self._get(group_by="weekday", metrics="count", tz="America/New_York")
        self.assertEqual(ny_weekday[0]["key"], "2")

    def test_weekday_is_monday_first(self):
        self._make_session(_utc("2026-06-01T12:00:00"))
        groups = self._get(group_by="weekday", metrics="count")
        self.assertEqual(groups, [{"key": "0", "values": {"count": 1}}])

    def test_hour_keys_sort_numerically(self):
        self._make_session(_utc("2026-06-01T02:00:00"))
        self._make_session(_utc("2026-06-01T10:00:00"))
        keys = [g["key"] for g in self._get(group_by="hour", metrics="count")]
        self.assertEqual(keys, ["2", "10"])

    def test_aggregate_functions_skip_missing_values(self):
        self._make_session(
            _utc("2026-06-01T08:00:00"),
            [{"toy": self.toy_a, "involvement": "FULLY_INSERTED", "duration_minutes": 30}],
        )
        self._make_session(
            _utc("2026-06-01T12:00:00"),
            [{"toy": self.toy_b, "involvement": "USED"}],
        )
        groups = self._get(
            group_by="date",
            metrics="count,max:insertable_length,min:duration,avg:duration,sum:duration",
        )
        values = groups[0]["values"]
        self.assertEqual(values["count"], 2)
        self.assertEqual(values["max:insertable_length"], 170)
        self.assertEqual(values["min:duration"], 30)
        self.assertEqual(values["avg:duration"], 30)
        self.assertEqual(values["sum:duration"], 30)

    def test_all_missing_values_yield_null(self):
        self._make_session(_utc("2026-06-01T08:00:00"), [{"involvement": "USED"}])
        groups = self._get(group_by="date", metrics="max:insertable_length,avg:duration")
        self.assertEqual(
            groups[0]["values"],
            {"max:insertable_length": None, "avg:duration": None},
        )

    def test_first_and_last_use_boundary_sessions(self):
        self._make_session(_utc("2026-06-01T08:00:00"), [{"involvement": "USED"}])
        self._make_session(
            _utc("2026-06-01T20:00:00"),
            [{"involvement": "FULLY_INSERTED", "duration_minutes": 45}],
        )
        groups = self._get(
            group_by="date", metrics="first:insertable_length,last:insertable_length"
        )
        values = groups[0]["values"]
        self.assertIsNone(values["first:insertable_length"])
        self.assertEqual(values["last:insertable_length"], 170)

    def test_range_boundaries_are_inclusive_local_days(self):
        self._make_session(_utc("2026-06-01T00:00:00"))
        self._make_session(_utc("2026-05-31T23:59:00"))
        self._make_session(_utc("2026-06-07T23:59:00"))
        self._make_session(_utc("2026-06-08T00:01:00"))
        groups = self._get(group_by="date", metrics="count", start="2026-06-01", end="2026-06-07")
        keys = [g["key"] for g in groups]
        self.assertEqual(keys, ["2026-06-01", "2026-06-07"])

    def test_range_boundaries_follow_timezone(self):
        self._make_session(_utc("2026-06-08T02:00:00"))
        utc_groups = self._get(
            group_by="date", metrics="count", start="2026-06-01", end="2026-06-07"
        )
        self.assertEqual(utc_groups, [])
        ny_groups = self._get(
            group_by="date",
            metrics="count",
            start="2026-06-01",
            end="2026-06-07",
            tz="America/New_York",
        )
        self.assertEqual([g["key"] for g in ny_groups], ["2026-06-07"])

    def test_open_ended_ranges(self):
        self._make_session(_utc("2026-06-01T12:00:00"))
        self._make_session(_utc("2026-07-01T12:00:00"))
        only_start = self._get(group_by="date", metrics="count", start="2026-06-15")
        self.assertEqual([g["key"] for g in only_start], ["2026-07-01"])
        only_end = self._get(group_by="date", metrics="count", end="2026-06-15")
        self.assertEqual([g["key"] for g in only_end], ["2026-06-01"])

    def test_dst_fall_back_buckets_double_hour_together(self):
        self._make_session(_utc("2025-10-26T00:30:00"))
        self._make_session(_utc("2025-10-26T01:30:00"))
        groups = self._get(group_by="hour", metrics="count", tz="Europe/Berlin")
        self.assertEqual(groups, [{"key": "2", "values": {"count": 2}}])

    def test_duplicate_metrics_are_deduped(self):
        self._make_session(_utc("2026-06-01T12:00:00"))
        groups = self._get(group_by="date", metrics="count,count")
        self.assertEqual(groups[0]["values"], {"count": 1})

    def test_invalid_parameters_return_400(self):
        cases = [
            {"group_by": "month", "metrics": "count"},
            {"group_by": "date", "metrics": "median:duration"},
            {"group_by": "date", "metrics": "max:unknown_field"},
            {"group_by": "date", "metrics": ""},
            {"group_by": "date", "metrics": "count", "tz": "Not/AZone"},
            {"group_by": "date", "metrics": "count", "start": "junk"},
            {
                "group_by": "date",
                "metrics": "count",
                "start": "2026-06-10",
                "end": "2026-06-01",
            },
        ]
        for params in cases:
            response = self.client.get(URL, params)
            self.assertEqual(response.status_code, 400, params)


class SessionStatsFilterTests(SessionStatsTestBase):
    def test_stats_respect_toy_filter(self):
        self._make_session(_utc("2026-06-01T08:00:00"), [{"toy": self.toy_a}])
        self._make_session(_utc("2026-06-01T09:00:00"), [{"toy": self.toy_b}])
        groups = self._get(group_by="date", metrics="count", toys=[self.toy_a])
        self.assertEqual(sum(g["values"]["count"] for g in groups), 1)

    def test_groups_by_toy_within_window(self):
        self._make_session(_utc("2026-06-01T08:00:00"), [{"toy": self.toy_a}, {"toy": self.toy_b}])
        self._make_session(_utc("2026-06-02T08:00:00"), [{"toy": self.toy_a}])
        self._make_session(_utc("2026-05-01T08:00:00"), [{"toy": self.toy_b}])
        groups = self._get(group_by="toy", metrics="count", start="2026-06-01")
        by_key = {g["key"]: g["values"]["count"] for g in groups}
        self.assertEqual(by_key, {str(self.toy_a): 2, str(self.toy_b): 1})

    def test_toyless_sessions_do_not_appear_in_toy_groups(self):
        self._make_session(_utc("2026-06-01T08:00:00"))
        groups = self._get(group_by="toy", metrics="count")
        self.assertEqual(groups, [])

    def test_stats_respect_media_filter(self):
        flagged = self._make_session(_utc("2026-06-01T08:00:00"))
        flagged.video_count = 1
        flagged.save(update_fields=["video_count"])
        self._make_session(_utc("2026-06-02T08:00:00"))
        groups = self._get(group_by="date", metrics="count", has_media="true")
        self.assertEqual(sum(g["values"]["count"] for g in groups), 1)


class StatsHasPrFilterTests(SessionStatsTestBase):
    def test_has_pr_limits_stats_to_record_sessions(self):
        holder = self._make_session(_utc("2026-06-01T10:00:00"), [{"toy": self.toy_a}])
        models.PersonalRecord.objects.create(
            key="pr-width", session=holder, toy_entry=holder.entries.first(), value=220.0
        )
        self._make_session(_utc("2026-06-02T10:00:00"), [{"toy": self.toy_a}])

        groups = self._get(group_by="date", metrics="count", has_pr="true")

        self.assertEqual(groups, [{"key": "2026-06-01", "values": {"count": 1}}])
