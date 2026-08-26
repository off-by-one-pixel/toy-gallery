from . import models
from .testutils import SessionApiTestBase
from .testutils import utc as _utc

URL = "/toys/sessions/"


class SessionListTestBase(SessionApiTestBase):
    def _get(self, **params):
        response = self.client.get(URL, params)
        self.assertEqual(response.status_code, 200, response.content)
        return response.data


class SessionListTests(SessionListTestBase):
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
        self.assertEqual([s["id"] for s in length["results"]], [s_big.id, s_small.id, s_used.id])
        circumference = self._get(ordering="circumference")
        self.assertEqual(
            [s["id"] for s in circumference["results"]], [s_small.id, s_big.id, s_used.id]
        )

    def test_live_session_is_first_regardless_of_window_and_ordering(self):
        toy = self._create_toy("L2")
        recent = self._make_session(
            _utc("2026-06-08T10:00:00"), [{"toy": toy, "duration_minutes": 10}]
        )
        live = models.Session.objects.create(started_at=_utc("2026-01-01T10:00:00"), is_live=True)

        windowed = self._get(start="2026-06-08")
        self.assertEqual([s["id"] for s in windowed["results"]], [live.id, recent.id])

        by_duration = self._get(ordering="duration")
        self.assertEqual(by_duration["results"][0]["id"], live.id)

        by_date_asc = self._get(ordering="started_at")
        self.assertEqual(by_date_asc["results"][0]["id"], live.id)

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


class SessionFilterTests(SessionListTestBase):
    def test_filters_by_any_of_the_selected_toys(self):
        toy_a = self._create_toy("A")
        toy_b = self._create_toy("B")
        toy_c = self._create_toy("C")
        with_a = self._make_session(_utc("2026-06-01T08:00:00"), [{"toy": toy_a}])
        with_b = self._make_session(_utc("2026-06-02T08:00:00"), [{"toy": toy_b}])
        self._make_session(_utc("2026-06-03T08:00:00"), [{"toy": toy_c}])
        data = self._get(toys=[toy_a, toy_b])
        self.assertEqual([s["id"] for s in data["results"]], [with_b.id, with_a.id])

    def test_session_with_several_selected_toys_appears_once(self):
        toy_a = self._create_toy("A")
        toy_b = self._create_toy("B")
        both = self._make_session(_utc("2026-06-01T08:00:00"), [{"toy": toy_a}, {"toy": toy_b}])
        data = self._get(toys=[toy_a, toy_b])
        self.assertEqual(data["count"], 1)
        self.assertEqual(data["results"][0]["id"], both.id)

    def test_toy_filter_keeps_duration_ordering_sums_intact(self):
        toy_a = self._create_toy("A")
        toy_b = self._create_toy("B")
        session = self._make_session(
            _utc("2026-06-01T08:00:00"),
            [
                {"toy": toy_a, "duration_minutes": 30},
                {"toy": toy_b, "duration_minutes": 40},
            ],
        )
        self._make_session(_utc("2026-06-02T08:00:00"), [{"toy": toy_a, "duration_minutes": 50}])
        data = self._get(toys=[toy_a, toy_b], ordering="-duration")
        self.assertEqual(data["results"][0]["id"], session.id)

    def test_filters_by_media_presence(self):
        with_photos = self._make_session(_utc("2026-06-01T08:00:00"))
        with_photos.photo_count = 2
        with_photos.save(update_fields=["photo_count"])
        with_video = self._make_session(_utc("2026-06-02T08:00:00"))
        with_video.video_count = 1
        with_video.save(update_fields=["video_count"])
        self._make_session(_utc("2026-06-03T08:00:00"))
        data = self._get(has_media="true")
        self.assertEqual([s["id"] for s in data["results"]], [with_video.id, with_photos.id])

    def test_live_session_bypasses_filters(self):
        toy_a = self._create_toy("A")
        live = models.Session.objects.create(started_at=_utc("2026-06-05T08:00:00"), is_live=True)
        self._make_session(_utc("2026-06-01T08:00:00"), [{"toy": toy_a}])
        data = self._get(toys=[toy_a], has_media="true")
        self.assertEqual(data["results"][0]["id"], live.id)

    def test_accepts_comma_separated_toys_wire_format(self):
        toy_a = self._create_toy("A")
        toy_b = self._create_toy("B")
        target = self._make_session(_utc("2026-06-01T08:00:00"), [{"toy": toy_a}])
        self._make_session(_utc("2026-06-02T08:00:00"), [{"toy": toy_b}])
        response = self.client.get(URL, {"toys": f"{toy_a}"})
        self.assertEqual(response.status_code, 200)
        both = self.client.get(URL, {"toys": f"{toy_a},{toy_b}"})
        self.assertEqual(both.status_code, 200)
        self.assertEqual(both.data["count"], 2)
        self.assertEqual(response.data["results"][0]["id"], target.id)

    def test_invalid_toys_param_rejected(self):
        response = self.client.get(URL, {"toys": ["1", "junk"]})
        self.assertEqual(response.status_code, 400)


class SessionHasPrFilterTests(SessionListTestBase):
    def test_has_pr_returns_only_sessions_with_records(self):
        toy = self._create_toy("A")
        holder = self._make_session(_utc("2026-06-01T10:00:00"), [{"toy": toy}])
        self._give_record(holder)
        self._make_session(_utc("2026-06-02T10:00:00"), [{"toy": toy}])

        data = self._get(has_pr="true")

        self.assertEqual(data["count"], 1)
        self.assertEqual(data["results"][0]["id"], holder.id)

    def test_absent_or_false_has_pr_returns_all_sessions(self):
        toy = self._create_toy("A")
        holder = self._make_session(_utc("2026-06-01T10:00:00"), [{"toy": toy}])
        self._give_record(holder)
        self._make_session(_utc("2026-06-02T10:00:00"), [{"toy": toy}])

        self.assertEqual(self._get()["count"], 2)
        self.assertEqual(self._get(has_pr="false")["count"], 2)

    def test_session_with_multiple_records_is_not_duplicated(self):
        toy = self._create_toy("A")
        holder = self._make_session(_utc("2026-06-01T10:00:00"), [{"toy": toy}])
        self._give_record(holder, key="pr-width")
        self._give_record(holder, key="pr-depth", value=170.0)

        data = self._get(has_pr="true")

        self.assertEqual(data["count"], 1)
        self.assertEqual(len(data["results"]), 1)

    def test_has_pr_combines_with_toy_filter(self):
        toy_a = self._create_toy("A")
        toy_b = self._create_toy("B")
        holder_a = self._make_session(_utc("2026-06-01T10:00:00"), [{"toy": toy_a}])
        self._give_record(holder_a)
        holder_b = self._make_session(_utc("2026-06-02T10:00:00"), [{"toy": toy_b}])
        self._give_record(holder_b)

        data = self._get(has_pr="true", toys=[toy_a])

        self.assertEqual(data["count"], 1)
        self.assertEqual(data["results"][0]["id"], holder_a.id)

    def test_live_session_is_listed_despite_the_filter(self):
        toy = self._create_toy("A")
        holder = self._make_session(_utc("2026-06-01T10:00:00"), [{"toy": toy}])
        self._give_record(holder)
        live = models.Session.objects.create(started_at=_utc("2026-06-03T10:00:00"), is_live=True)

        data = self._get(has_pr="true")

        self.assertEqual({r["id"] for r in data["results"]}, {holder.id, live.id})
