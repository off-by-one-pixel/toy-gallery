from contextlib import contextmanager
from datetime import timedelta

from django.db import connection, transaction
from django.test.utils import CaptureQueriesContext

from toys.records.session import record_session, resync_records, session_record
from toys.records.toy import toy_record

from . import models
from .records import SESSION_RECORD_DEFINITIONS, TOY_RECORD_DEFINITIONS, DuplicateRecordKey
from .testutils import ApiTestBase
from .testutils import utc as _utc

LEVELS = ["USED", "INSERTED", "FULLY_INSERTED"]
KEYS_WITH_OPTIONAL_VALUES = ["pr-width", "pr-depth", "pr-time", "pr-duration", "toy-time"]


class RecordsTestBase(ApiTestBase):
    default_involvement = "FULLY_INSERTED"

    def _rows(self, key):
        return list(models.PersonalRecord.objects.filter(key=key).order_by("id"))

    def _session_on(self, day, entries=(), minutes=None, **fields):
        started_at = _utc(f"2026-06-{day:02d}T10:00:00")
        ended_at = None if minutes is None else started_at + timedelta(minutes=minutes)
        return self._make_session(started_at, entries, ended_at, **fields)

    def _record_on(self, day, entries=(), minutes=None):
        session = self._session_on(day, entries, minutes)
        record_session(session)
        return session


class RecordRegistryTests(RecordsTestBase):
    def test_duplicate_session_key_registration_raises(self):
        with self.assertRaises(DuplicateRecordKey):
            session_record("pr-width")(lambda ctx: None)

    def test_duplicate_toy_key_registration_raises(self):
        with self.assertRaises(DuplicateRecordKey):
            toy_record("toy-time")(lambda ctx: None)

    def test_key_must_be_unique_across_both_registries(self):
        with self.assertRaises(DuplicateRecordKey):
            session_record("toy-time")(lambda ctx: None)
        with self.assertRaises(DuplicateRecordKey):
            toy_record("pr-width")(lambda ctx: None)

    def test_seed_definitions_are_registered(self):
        self.assertIn("pr-width", SESSION_RECORD_DEFINITIONS)
        self.assertIn("pr-depth", SESSION_RECORD_DEFINITIONS)
        self.assertIn("pr-time", SESSION_RECORD_DEFINITIONS)
        self.assertIn("pr-duration", SESSION_RECORD_DEFINITIONS)
        self.assertIn("toy-time", TOY_RECORD_DEFINITIONS)
        self.assertIn("toy-level", TOY_RECORD_DEFINITIONS)


class RecordProgressionTests(RecordsTestBase):
    def setUp(self):
        super().setUp()
        self.toy = self._create_toy("A")

    def _sized(self, field):
        def record(day, value):
            toy = self._create_toy(f"{field}-{day}", **{field: value})
            return self._record_on(day, [{"toy": toy}])

        return record

    def _timed(self, day, value):
        return self._record_on(day, [{"toy": self.toy, "duration_minutes": value}])

    def _lasting(self, day, value):
        return self._record_on(day, [{"toy": self.toy}], minutes=value)

    def _leveled(self, day, value):
        return self._record_on(day, [{"toy": self.toy, "involvement": LEVELS[value]}])

    def _cases(self):
        return {
            "pr-width": (self._sized("circumference"), 220.0, 240.0),
            "pr-depth": (self._sized("insertable_length"), 170.0, 190.0),
            "pr-time": (self._timed, 30, 45),
            "pr-duration": (self._lasting, 60, 90),
            "toy-time": (self._timed, 30, 45),
            "toy-level": (self._leveled, 0, 2),
        }

    @contextmanager
    def _isolated(self, key):
        with self.subTest(key=key), transaction.atomic():
            yield
            transaction.set_rollback(True)

    def _history(self, key):
        return [(r.session_id, r.value) for r in self._rows(key)]

    def test_first_value_sets_the_record_and_a_better_one_keeps_history(self):
        for key, (record, low, high) in self._cases().items():
            with self._isolated(key):
                first = record(1, low)
                second = record(2, high)
                self.assertEqual(self._history(key), [(first.id, low), (second.id, high)])

    def test_equal_or_worse_value_is_not_a_record(self):
        for key, (record, low, high) in self._cases().items():
            with self._isolated(key):
                first = record(1, high)
                record(2, high)
                record(3, low)
                self.assertEqual(self._history(key), [(first.id, high)])

    def test_missing_value_never_records_and_is_ignored_in_the_baseline(self):
        cases = self._cases()
        for key in KEYS_WITH_OPTIONAL_VALUES:
            record, low, _ = cases[key]
            with self._isolated(key):
                record(1, None)
                self.assertEqual(self._history(key), [])
                candidate = record(2, low)
                self.assertEqual(self._history(key), [(candidate.id, low)])


class SessionDurationRecordTests(RecordsTestBase):
    def test_ended_session_sets_the_duration_record(self):
        toy = self._create_toy("A")
        session = self._record_on(1, [{"toy": toy}], minutes=90)

        rows = self._rows("pr-duration")
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].value, 90.0)
        self.assertEqual(rows[0].session_id, session.id)
        self.assertIsNone(rows[0].toy_entry)
        self.assertIsNone(rows[0].toy_id)

    def test_ending_a_session_records_its_duration_on_reevaluation(self):
        toy = self._create_toy("A")
        session = self._record_on(1, [{"toy": toy}])
        self.assertEqual(len(self._rows("pr-duration")), 0)

        session.ended_at = session.started_at + timedelta(minutes=45)
        session.save()
        record_session(session)

        rows = self._rows("pr-duration")
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].value, 45.0)


class LiveSessionRecordTests(RecordsTestBase):
    def _live_session(self, toy, duration=30):
        return self._session_on(1, [{"toy": toy, "duration_minutes": duration}], is_live=True)

    def test_live_sessions_are_not_evaluated(self):
        toy = self._create_toy("A")
        session = self._live_session(toy)

        record_session(session)

        self.assertEqual(models.PersonalRecord.objects.count(), 0)

    def test_updating_a_live_session_creates_no_records(self):
        toy = self._create_toy("A")
        session = self._live_session(toy)

        response = self.client.patch(
            f"/toys/sessions/{session.id}/", {"started_at": "2026-06-01T09:00:00Z"}, format="json"
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["records"], [])
        self.assertEqual(models.PersonalRecord.objects.count(), 0)

    def test_ending_a_live_session_evaluates_all_records(self):
        toy = self._create_toy("A")
        session = self._live_session(toy, duration=45)

        response = self.client.patch(
            f"/toys/sessions/{session.id}/", {"ended_at": "2026-06-01T11:30:00Z"}, format="json"
        )

        self.assertEqual(response.status_code, 200, response.content)
        keys = {r["key"] for r in response.data["records"]}
        self.assertEqual(
            keys, {"pr-width", "pr-depth", "pr-time", "pr-duration", "toy-time", "toy-level"}
        )

    def test_live_sessions_are_excluded_from_other_baselines(self):
        toy = self._create_toy("A")
        self._live_session(toy, duration=90)
        ended = self._record_on(2, [{"toy": toy, "duration_minutes": 30}])

        rows = self._rows("toy-time")
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].session_id, ended.id)
        self.assertEqual(rows[0].value, 30.0)


class ToyRecordDriverTests(RecordsTestBase):
    def test_recording_a_session_sets_toy_records_with_the_toy_fk(self):
        toy = self._create_toy("A")
        session = self._record_on(1, [{"toy": toy, "duration_minutes": 30}])

        time_rows = self._rows("toy-time")
        level_rows = self._rows("toy-level")
        self.assertEqual(len(time_rows), 1)
        self.assertEqual(len(level_rows), 1)
        self.assertEqual(time_rows[0].toy_id, toy)
        self.assertEqual(time_rows[0].session_id, session.id)
        self.assertEqual(time_rows[0].toy_entry, session.entries.get())
        self.assertEqual(time_rows[0].value, 30.0)
        self.assertEqual(level_rows[0].toy_id, toy)
        self.assertEqual(level_rows[0].value, 2.0)

    def test_session_records_keep_a_null_toy(self):
        toy = self._create_toy("A")
        self._record_on(1, [{"toy": toy}])

        self.assertIsNone(self._rows("pr-width")[0].toy_id)
        self.assertIsNone(self._rows("pr-depth")[0].toy_id)
        self.assertEqual(self._rows("toy-level")[0].toy_id, toy)

    def test_each_toy_in_a_session_gets_its_own_rows(self):
        toy_a = self._create_toy("A")
        toy_b = self._create_toy("B")
        self._record_on(
            1, [{"toy": toy_a, "duration_minutes": 10}, {"toy": toy_b, "duration_minutes": 90}]
        )

        time_rows = self._rows("toy-time")
        self.assertEqual({(r.toy_id, r.value) for r in time_rows}, {(toy_a, 10.0), (toy_b, 90.0)})
        for row in time_rows:
            self.assertEqual(row.toy_entry.toy_id, row.toy_id)

    def test_beating_the_toy_record_keeps_history_per_toy(self):
        toy_a = self._create_toy("A")
        toy_b = self._create_toy("B")
        first = self._record_on(
            1, [{"toy": toy_a, "duration_minutes": 30}, {"toy": toy_b, "duration_minutes": 60}]
        )
        second = self._record_on(
            2, [{"toy": toy_a, "duration_minutes": 45}, {"toy": toy_b, "duration_minutes": 50}]
        )

        rows = [(r.session_id, r.toy_id, r.value) for r in self._rows("toy-time")]
        self.assertEqual(
            rows, [(first.id, toy_a, 30.0), (first.id, toy_b, 60.0), (second.id, toy_a, 45.0)]
        )

    def test_rerecording_an_unchanged_session_keeps_the_original_rows(self):
        toy = self._create_toy("A")
        session = self._record_on(1, [{"toy": toy, "duration_minutes": 30}])
        before = {(r.key, r.id) for r in models.PersonalRecord.objects.all()}

        record_session(session)

        after = {(r.key, r.id) for r in models.PersonalRecord.objects.all()}
        self.assertEqual(
            {key for key, _ in before}, {"pr-width", "pr-depth", "pr-time", "toy-time", "toy-level"}
        )
        self.assertEqual(before, after)

    def test_editing_an_older_session_keeps_the_newest_row_as_the_standing_record(self):
        toy = self._create_toy("A")
        older = self._record_on(1, [{"toy": toy, "duration_minutes": 30}])
        newer = self._record_on(2, [{"toy": toy, "duration_minutes": 45}])

        entry = older.entries.get()
        entry.involvement = "INSERTED"
        entry.save()
        record_session(older)

        time_rows = models.PersonalRecord.objects.filter(key="toy-time").order_by(
            "-session__started_at"
        )
        self.assertEqual([r.value for r in time_rows], [45.0, 30.0])
        self.assertEqual(time_rows[0].session_id, newer.id)

    def test_reevaluation_replaces_the_row_for_the_same_session_key_and_toy(self):
        toy = self._create_toy("A")
        session = self._record_on(1, [{"toy": toy, "duration_minutes": 30}])

        entry = session.entries.get()
        entry.duration_minutes = 40
        entry.save()
        record_session(session)

        time_rows = self._rows("toy-time")
        self.assertEqual(len(time_rows), 1)
        self.assertEqual(time_rows[0].value, 40.0)

    def test_reevaluation_removes_the_row_when_the_entry_no_longer_qualifies(self):
        toy = self._create_toy("A")
        session = self._record_on(1, [{"toy": toy, "duration_minutes": 30}])
        self.assertEqual(len(self._rows("toy-time")), 1)

        entry = session.entries.get()
        entry.duration_minutes = None
        entry.save()
        record_session(session)

        self.assertEqual(len(self._rows("toy-time")), 0)
        self.assertEqual(len(self._rows("toy-level")), 1)

    def test_backdated_session_uses_only_the_toy_sessions_before_it(self):
        toy = self._create_toy("A")
        later = self._record_on(5, [{"toy": toy, "duration_minutes": 45}])
        backdated = self._record_on(1, [{"toy": toy, "duration_minutes": 60}])

        rows = [(r.session_id, r.value) for r in self._rows("toy-time")]
        self.assertEqual(rows, [(later.id, 45.0), (backdated.id, 60.0)])


class RecordSessionTests(RecordsTestBase):
    def test_session_without_qualifying_entries_creates_no_rows(self):
        self._record_on(1)
        self.assertEqual(models.PersonalRecord.objects.count(), 0)

    def test_qualifying_session_sets_width_and_depth(self):
        toy = self._create_toy("A")
        session = self._record_on(1, [{"toy": toy}])

        width = self._rows("pr-width")
        depth = self._rows("pr-depth")
        self.assertEqual(len(width), 1)
        self.assertEqual(len(depth), 1)
        self.assertEqual(width[0].session_id, session.id)
        self.assertEqual(width[0].toy_entry.toy_id, toy)
        self.assertEqual(width[0].value, 220.0)
        self.assertEqual(depth[0].session_id, session.id)
        self.assertEqual(depth[0].toy_entry.toy_id, toy)
        self.assertEqual(depth[0].value, 170.0)

    def test_equal_value_on_one_key_still_evaluates_the_others(self):
        toy = self._create_toy("A")
        session = self._record_on(1, [{"toy": toy, "involvement": "INSERTED"}])
        self.assertEqual(len(self._rows("pr-width")), 1)
        self.assertEqual(len(self._rows("pr-depth")), 0)

        entry = session.entries.get()
        entry.involvement = "FULLY_INSERTED"
        entry.save()
        record_session(session)

        self.assertEqual(len(self._rows("pr-width")), 1)
        self.assertEqual(len(self._rows("pr-depth")), 1)

    def test_stale_row_removed_when_session_no_longer_qualifies(self):
        toy = self._create_toy("A")
        session = self._record_on(1, [{"toy": toy, "involvement": "INSERTED"}])
        self.assertEqual(len(self._rows("pr-width")), 1)

        entry = session.entries.get()
        entry.involvement = "USED"
        entry.save()
        record_session(session)

        self.assertEqual(len(self._rows("pr-width")), 0)

    def test_deleting_the_record_holder_leaves_the_older_row_standing(self):
        toy_a = self._create_toy("A")
        first = self._record_on(1, [{"toy": toy_a}])

        toy_b = self._create_toy("B", circumference=240.0, insertable_length=190)
        second = self._record_on(2, [{"toy": toy_b}])
        self.assertEqual(len(self._rows("pr-width")), 2)

        second.delete()
        self.assertEqual(len(self._rows("pr-width")), 1)

        self._record_on(3, [{"toy": toy_a}])

        width = self._rows("pr-width")
        self.assertEqual(len(width), 1)
        self.assertEqual(width[0].session_id, first.id)
        self.assertEqual(width[0].value, 220.0)


class RecordApiTests(RecordsTestBase):
    def _records_by_key(self, data):
        return {r["key"]: r for r in data["records"]}

    def test_post_evaluates_records_and_embeds_them_in_the_response(self):
        toy = self._create_toy("A")
        data = self._post_session([{"toy": toy, "involvement": "FULLY_INSERTED"}])

        recs = self._records_by_key(data)
        self.assertEqual(set(recs), {"pr-width", "pr-depth", "toy-level"})
        self.assertEqual(recs["pr-width"]["toy"], toy)
        self.assertEqual(recs["pr-width"]["value"], 220.0)
        self.assertEqual(recs["pr-width"]["achieved_at"], "2026-06-01T10:00:00Z")
        self.assertEqual(recs["pr-depth"]["value"], 170.0)
        self.assertEqual(recs["toy-level"]["toy"], toy)
        self.assertEqual(models.PersonalRecord.objects.filter(session_id=data["id"]).count(), 3)

    def test_post_with_durations_embeds_the_plugged_time_record(self):
        toy = self._create_toy("A")
        data = self._post_session(
            [{"toy": toy, "involvement": "FULLY_INSERTED", "duration_minutes": 45}]
        )

        recs = self._records_by_key(data)
        self.assertIn("pr-time", recs)
        self.assertEqual(recs["pr-time"]["value"], 45.0)
        self.assertIsNone(recs["pr-time"]["toy"])

        listed = self.client.get("/toys/sessions/")
        self.assertEqual(listed.status_code, 200, listed.content)
        row = next(r for r in listed.data["results"] if r["id"] == data["id"])
        self.assertIn("pr-time", self._records_by_key(row))

    def test_session_below_the_record_gets_no_records(self):
        toy_a = self._create_toy("A", circumference=240.0, insertable_length=190)
        self._post_session([{"toy": toy_a, "involvement": "FULLY_INSERTED"}])

        toy_b = self._create_toy("B")
        data = self._post_session(
            [{"toy": toy_b, "involvement": "FULLY_INSERTED"}], "2026-06-02T10:00:00Z"
        )
        self.assertEqual(set(self._records_by_key(data)), {"toy-level"})

    def test_backdated_session_is_evaluated_against_earlier_sessions_only(self):
        toy_big = self._create_toy("Big", circumference=240.0, insertable_length=190)
        later = self._post_session(
            [{"toy": toy_big, "involvement": "FULLY_INSERTED"}], "2026-06-05T10:00:00Z"
        )

        toy_small = self._create_toy("Small")
        backdated = self._post_session([{"toy": toy_small, "involvement": "FULLY_INSERTED"}])

        recs = self._records_by_key(backdated)
        self.assertEqual(recs["pr-width"]["value"], 220.0)
        self.assertEqual(recs["pr-depth"]["value"], 170.0)
        self.assertEqual(models.PersonalRecord.objects.filter(session_id=later["id"]).count(), 3)
        self.assertEqual(models.PersonalRecord.objects.count(), 6)

    def test_list_and_detail_embed_records_on_the_owning_session(self):
        toy_a = self._create_toy("A")
        first = self._post_session([{"toy": toy_a, "involvement": "FULLY_INSERTED"}])
        toy_b = self._create_toy("B", circumference=240.0, insertable_length=190)
        second = self._post_session(
            [{"toy": toy_b, "involvement": "FULLY_INSERTED"}], "2026-06-02T10:00:00Z"
        )

        listed = self.client.get("/toys/sessions/")
        self.assertEqual(listed.status_code, 200, listed.content)
        by_id = {row["id"]: row for row in listed.data["results"]}
        self.assertEqual(self._records_by_key(by_id[first["id"]])["pr-width"]["value"], 220.0)
        self.assertEqual(self._records_by_key(by_id[second["id"]])["pr-width"]["value"], 240.0)

        detail = self.client.get(f"/toys/sessions/{first['id']}/")
        self.assertEqual(detail.status_code, 200, detail.content)
        self.assertEqual(self._records_by_key(detail.data)["pr-depth"]["value"], 170.0)

    def test_update_reevaluates_the_session(self):
        toy_a = self._create_toy("A")
        data = self._post_session([{"toy": toy_a, "involvement": "FULLY_INSERTED"}])

        toy_b = self._create_toy("B", circumference=240.0, insertable_length=190)
        updated = self._put_session(data["id"], [{"toy": toy_b, "involvement": "FULLY_INSERTED"}])

        recs = self._records_by_key(updated)
        self.assertEqual(recs["pr-width"]["toy"], toy_b)
        self.assertEqual(recs["pr-width"]["value"], 240.0)
        self.assertEqual(models.PersonalRecord.objects.filter(session_id=data["id"]).count(), 3)

    def test_update_that_disqualifies_removes_the_rows(self):
        toy = self._create_toy("A")
        data = self._post_session([{"toy": toy, "involvement": "FULLY_INSERTED"}])
        self.assertEqual(models.PersonalRecord.objects.count(), 3)

        updated = self._put_session(data["id"], [{"toy": toy, "involvement": "USED"}])
        recs = self._records_by_key(updated)
        self.assertEqual(set(recs), {"toy-level"})
        self.assertEqual(recs["toy-level"]["value"], 0.0)
        self.assertEqual(len(self._rows("pr-width")), 0)
        self.assertEqual(len(self._rows("pr-depth")), 0)

    def test_start_time_only_patch_keeps_the_records(self):
        toy = self._create_toy("A")
        data = self._post_session([{"toy": toy, "involvement": "FULLY_INSERTED"}])

        response = self.client.patch(
            f"/toys/sessions/{data['id']}/",
            {"started_at": "2026-06-01T09:00:00Z"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            set(self._records_by_key(response.data)), {"pr-width", "pr-depth", "toy-level"}
        )

    def test_reads_do_not_evaluate(self):
        toy = self._create_toy("A", circumference=240.0, insertable_length=190)
        session = self._session_on(1, [{"toy": toy}])

        listed = self.client.get("/toys/sessions/")
        self.assertEqual(listed.status_code, 200, listed.content)
        detail = self.client.get(f"/toys/sessions/{session.id}/")
        self.assertEqual(detail.status_code, 200, detail.content)

        self.assertEqual(models.PersonalRecord.objects.count(), 0)
        self.assertEqual(detail.data["records"], [])


class ToyRecordEmbeddingTests(RecordsTestBase):
    def _toy_row(self, toy_id):
        response = self.client.get("/toys/toys/")
        self.assertEqual(response.status_code, 200, response.content)
        return next(r for r in response.data if r["id"] == toy_id)

    def test_toy_rows_embed_toy_records_grouped_by_key_newest_first(self):
        toy = self._create_toy("A")
        self._post_session([{"toy": toy, "involvement": "FULLY_INSERTED", "duration_minutes": 30}])
        self._post_session(
            [{"toy": toy, "involvement": "FULLY_INSERTED", "duration_minutes": 60}],
            "2026-06-02T10:00:00Z",
        )

        rows = self._toy_row(toy)["records"]
        self.assertEqual(
            [(r["key"], r["value"]) for r in rows],
            [("toy-level", 2.0), ("toy-time", 60.0), ("toy-time", 30.0)],
        )

    def test_session_scoped_records_stay_off_the_toy(self):
        toy = self._create_toy("A")
        self._post_session([{"toy": toy, "involvement": "FULLY_INSERTED"}])
        self.assertTrue(models.PersonalRecord.objects.filter(key="pr-width").exists())

        keys = {r["key"] for r in self._toy_row(toy)["records"]}
        self.assertEqual(keys, {"toy-level"})

    def test_toy_record_rows_carry_only_key_value_and_achieved_at(self):
        toy = self._create_toy("A")
        self._post_session([{"toy": toy, "involvement": "FULLY_INSERTED"}])

        row = self._toy_row(toy)["records"][0]
        self.assertEqual(set(row), {"key", "value", "achieved_at"})
        self.assertEqual(row["achieved_at"], "2026-06-01T10:00:00Z")

    def test_toy_records_are_dated_and_ordered_by_their_session_not_row_creation(self):
        toy = self._create_toy("A")
        self._post_session(
            [{"toy": toy, "involvement": "FULLY_INSERTED", "duration_minutes": 60}],
            "2026-06-05T10:00:00Z",
        )
        self._post_session([{"toy": toy, "involvement": "USED", "duration_minutes": 30}])

        rows = [r for r in self._toy_row(toy)["records"] if r["key"] == "toy-time"]
        self.assertEqual([r["value"] for r in rows], [60.0, 30.0])
        self.assertEqual(
            [r["achieved_at"] for r in rows],
            ["2026-06-05T10:00:00Z", "2026-06-01T10:00:00Z"],
        )

    def test_toy_without_records_embeds_an_empty_list(self):
        toy = self._create_toy("A")
        self.assertEqual(self._toy_row(toy)["records"], [])

    def test_toy_detail_embeds_the_same_records(self):
        toy = self._create_toy("A")
        self._post_session([{"toy": toy, "involvement": "INSERTED"}])

        response = self.client.get(f"/toys/toys/{toy}/")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual([r["key"] for r in response.data["records"]], ["toy-level"])
        self.assertEqual(response.data["records"][0]["value"], 1.0)

    def test_toy_list_query_count_stays_flat_as_toys_grow(self):
        first = self._create_toy("A")
        self._post_session(
            [{"toy": first, "involvement": "FULLY_INSERTED", "duration_minutes": 30}]
        )
        with CaptureQueriesContext(connection) as before:
            self.assertEqual(self.client.get("/toys/toys/").status_code, 200)

        second = self._create_toy("B", circumference=240.0, insertable_length=190)
        self._post_session(
            [{"toy": second, "involvement": "FULLY_INSERTED", "duration_minutes": 45}],
            "2026-06-02T10:00:00Z",
        )
        with CaptureQueriesContext(connection) as after:
            self.assertEqual(self.client.get("/toys/toys/").status_code, 200)

        self.assertEqual(len(before.captured_queries), len(after.captured_queries))


class ResyncTests(RecordsTestBase):
    def test_resync_rebuilds_history_chronologically(self):
        toy_a = self._create_toy("A")
        toy_b = self._create_toy("B", circumference=240.0, insertable_length=190)
        toy_c = self._create_toy("C", circumference=230.0, insertable_length=180)
        first = self._session_on(1, [{"toy": toy_a}])
        second = self._session_on(2, [{"toy": toy_b}])
        self._session_on(3, [{"toy": toy_c}])

        resync_records()

        width = self._rows("pr-width")
        self.assertEqual(
            [(r.session_id, r.value) for r in width],
            [(first.id, 220.0), (second.id, 240.0)],
        )
        depth = self._rows("pr-depth")
        self.assertEqual(
            [(r.session_id, r.value) for r in depth],
            [(first.id, 170.0), (second.id, 190.0)],
        )

    def test_resync_replaces_stale_rows(self):
        toy = self._create_toy("A")
        session = self._session_on(1, [{"toy": toy}])
        models.PersonalRecord.objects.create(
            key="pr-width", session=session, toy_entry=session.entries.get(), value=999.0
        )

        resync_records()

        width = self._rows("pr-width")
        self.assertEqual(len(width), 1)
        self.assertEqual(width[0].value, 220.0)
        self.assertEqual(len(self._rows("pr-depth")), 1)

    def test_resync_is_idempotent_and_safe_on_empty_data(self):
        resync_records()
        self.assertEqual(models.PersonalRecord.objects.count(), 0)

        toy = self._create_toy("A")
        self._session_on(1, [{"toy": toy}])
        resync_records()
        resync_records()

        self.assertEqual(len(self._rows("pr-width")), 1)
        self.assertEqual(len(self._rows("pr-depth")), 1)

    def test_resync_skips_live_sessions(self):
        toy = self._create_toy("A")
        live = self._session_on(1, [{"toy": toy, "duration_minutes": 90}], is_live=True)
        ended = self._session_on(2, [{"toy": toy, "duration_minutes": 30}])

        resync_records()

        self.assertEqual(models.PersonalRecord.objects.filter(session=live).count(), 0)
        time_rows = self._rows("toy-time")
        self.assertEqual(len(time_rows), 1)
        self.assertEqual(time_rows[0].session_id, ended.id)

    def test_rebuild_endpoint_resyncs_and_reports_the_row_count(self):
        toy_a = self._create_toy("A")
        toy_b = self._create_toy("B", circumference=240.0, insertable_length=190)
        self._session_on(1, [{"toy": toy_a}])
        self._session_on(2, [{"toy": toy_b}])

        response = self.client.post("/toys/sessions/rebuild-records/")

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data, {"records": 6})
        self.assertEqual(models.PersonalRecord.objects.count(), 6)
        self.assertEqual(len(self._rows("pr-width")), 2)
        self.assertEqual(len(self._rows("toy-level")), 2)
