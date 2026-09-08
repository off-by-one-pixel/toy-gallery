from toys.records.session import record_session, resync_records, session_record
from toys.records.toy import toy_record

from . import models
from .records import (
    SESSION_RECORD_DEFINITIONS,
    TOY_RECORD_DEFINITIONS,
    DuplicateRecordKey,
    RecordCheckResult,
    ToyRecordCheckCtx,
)
from .testutils import SessionApiTestBase
from .testutils import utc as _utc


class RecordsTestBase(SessionApiTestBase):
    default_involvement = "FULLY_INSERTED"

    def _rows(self, key):
        return list(models.PersonalRecord.objects.filter(key=key).order_by("id"))


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


class ToyRecordCheckTests(RecordsTestBase):
    def _entry(self, session, toy):
        return session.entries.get(toy_id=toy)

    def _check(self, key, sessions, entry):
        ctx = ToyRecordCheckCtx(sessions=list(sessions), entry=entry)
        return TOY_RECORD_DEFINITIONS[key](ctx)

    def test_first_use_sets_the_time_record(self):
        toy = self._create_toy("A")
        session = self._make_session(
            _utc("2026-06-01T10:00:00"), [{"toy": toy, "duration_minutes": 30}]
        )
        entry = self._entry(session, toy)

        result = self._check("toy-time", [], entry)

        self.assertIsInstance(result, RecordCheckResult)
        self.assertEqual(result.entry, entry)
        self.assertEqual(result.value, 30.0)

    def test_longer_use_beats_the_prior_best(self):
        toy = self._create_toy("A")
        prior = self._make_session(
            _utc("2026-06-01T10:00:00"), [{"toy": toy, "duration_minutes": 30}]
        )
        candidate = self._make_session(
            _utc("2026-06-02T10:00:00"), [{"toy": toy, "duration_minutes": 45}]
        )

        result = self._check("toy-time", [prior], self._entry(candidate, toy))

        self.assertEqual(result.value, 45.0)

    def test_equal_or_shorter_use_is_not_a_record(self):
        toy = self._create_toy("A")
        prior = self._make_session(
            _utc("2026-06-01T10:00:00"), [{"toy": toy, "duration_minutes": 30}]
        )
        equal = self._make_session(
            _utc("2026-06-02T10:00:00"), [{"toy": toy, "duration_minutes": 30}]
        )
        shorter = self._make_session(
            _utc("2026-06-03T10:00:00"), [{"toy": toy, "duration_minutes": 20}]
        )

        self.assertIsNone(self._check("toy-time", [prior], self._entry(equal, toy)))
        self.assertIsNone(self._check("toy-time", [prior], self._entry(shorter, toy)))

    def test_entry_without_duration_never_records_time(self):
        toy = self._create_toy("A")
        session = self._make_session(_utc("2026-06-01T10:00:00"), [{"toy": toy}])

        self.assertIsNone(self._check("toy-time", [], self._entry(session, toy)))

    def test_prior_entries_without_duration_are_ignored_in_the_baseline(self):
        toy = self._create_toy("A")
        prior = self._make_session(_utc("2026-06-01T10:00:00"), [{"toy": toy}])
        candidate = self._make_session(
            _utc("2026-06-02T10:00:00"), [{"toy": toy, "duration_minutes": 25}]
        )

        result = self._check("toy-time", [prior], self._entry(candidate, toy))

        self.assertEqual(result.value, 25.0)

    def test_other_toys_in_baseline_sessions_are_ignored(self):
        toy = self._create_toy("A")
        other = self._create_toy("B")
        prior = self._make_session(
            _utc("2026-06-01T10:00:00"),
            [{"toy": toy, "duration_minutes": 10}, {"toy": other, "duration_minutes": 90}],
        )
        candidate = self._make_session(
            _utc("2026-06-02T10:00:00"), [{"toy": toy, "duration_minutes": 20}]
        )

        result = self._check("toy-time", [prior], self._entry(candidate, toy))

        self.assertEqual(result.value, 20.0)

    def test_first_use_sets_the_level_record(self):
        toy = self._create_toy("A")
        session = self._make_session(
            _utc("2026-06-01T10:00:00"), [{"toy": toy, "involvement": "USED"}]
        )

        result = self._check("toy-level", [], self._entry(session, toy))

        self.assertEqual(result.value, 0.0)

    def test_level_up_beats_the_prior_best(self):
        toy = self._create_toy("A")
        prior = self._make_session(
            _utc("2026-06-01T10:00:00"), [{"toy": toy, "involvement": "USED"}]
        )
        candidate = self._make_session(
            _utc("2026-06-02T10:00:00"), [{"toy": toy, "involvement": "FULLY_INSERTED"}]
        )

        result = self._check("toy-level", [prior], self._entry(candidate, toy))

        self.assertEqual(result.value, 2.0)

    def test_same_or_lower_level_is_not_a_record(self):
        toy = self._create_toy("A")
        prior = self._make_session(
            _utc("2026-06-01T10:00:00"), [{"toy": toy, "involvement": "FULLY_INSERTED"}]
        )
        same = self._make_session(
            _utc("2026-06-02T10:00:00"), [{"toy": toy, "involvement": "FULLY_INSERTED"}]
        )
        lower = self._make_session(
            _utc("2026-06-03T10:00:00"), [{"toy": toy, "involvement": "INSERTED"}]
        )

        self.assertIsNone(self._check("toy-level", [prior], self._entry(same, toy)))
        self.assertIsNone(self._check("toy-level", [prior], self._entry(lower, toy)))

    def test_level_ranks_map_the_involvement_order(self):
        toy = self._create_toy("A")
        inserted = self._make_session(
            _utc("2026-06-01T10:00:00"), [{"toy": toy, "involvement": "INSERTED"}]
        )

        result = self._check("toy-level", [], self._entry(inserted, toy))

        self.assertEqual(result.value, 1.0)


class SessionTimeRecordTests(RecordsTestBase):
    def test_longer_total_beats_the_prior_best_and_keeps_history(self):
        toy = self._create_toy("A")
        first = self._make_session(
            _utc("2026-06-01T10:00:00"), [{"toy": toy, "duration_minutes": 45}]
        )
        record_session(first)

        second = self._make_session(
            _utc("2026-06-02T10:00:00"), [{"toy": toy, "duration_minutes": 60}]
        )
        record_session(second)

        rows = [(r.session_id, r.value) for r in self._rows("pr-time")]
        self.assertEqual(rows, [(first.id, 45.0), (second.id, 60.0)])

    def test_equal_or_smaller_total_is_not_a_record(self):
        toy = self._create_toy("A")
        first = self._make_session(
            _utc("2026-06-01T10:00:00"), [{"toy": toy, "duration_minutes": 45}]
        )
        record_session(first)

        equal = self._make_session(
            _utc("2026-06-02T10:00:00"), [{"toy": toy, "duration_minutes": 45}]
        )
        record_session(equal)
        smaller = self._make_session(
            _utc("2026-06-03T10:00:00"),
            [
                {"toy": toy, "duration_minutes": 20},
                {"toy": self._create_toy("B"), "duration_minutes": 20},
            ],
        )
        record_session(smaller)

        rows = self._rows("pr-time")
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].session_id, first.id)

    def test_sessions_without_durations_never_record_time(self):
        toy = self._create_toy("A")
        session = self._make_session(_utc("2026-06-01T10:00:00"), [{"toy": toy}])
        record_session(session)
        self.assertEqual(len(self._rows("pr-time")), 0)

    def test_prior_sessions_without_durations_are_ignored_in_the_baseline(self):
        toy = self._create_toy("A")
        prior = self._make_session(_utc("2026-06-01T10:00:00"), [{"toy": toy}])
        record_session(prior)
        candidate = self._make_session(
            _utc("2026-06-02T10:00:00"), [{"toy": toy, "duration_minutes": 10}]
        )
        record_session(candidate)

        rows = self._rows("pr-time")
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].session_id, candidate.id)


class SessionDurationRecordTests(RecordsTestBase):
    def test_ended_session_sets_the_duration_record(self):
        toy = self._create_toy("A")
        session = self._make_session(
            _utc("2026-06-01T10:00:00"), [{"toy": toy}], ended_at=_utc("2026-06-01T11:30:00")
        )

        record_session(session)

        rows = self._rows("pr-duration")
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].value, 90.0)
        self.assertEqual(rows[0].session_id, session.id)
        self.assertIsNone(rows[0].toy_entry)
        self.assertIsNone(rows[0].toy_id)

    def test_longer_session_beats_the_prior_best_and_keeps_history(self):
        toy = self._create_toy("A")
        first = self._make_session(
            _utc("2026-06-01T10:00:00"), [{"toy": toy}], ended_at=_utc("2026-06-01T11:00:00")
        )
        record_session(first)
        second = self._make_session(
            _utc("2026-06-02T10:00:00"), [{"toy": toy}], ended_at=_utc("2026-06-02T12:00:00")
        )
        record_session(second)

        rows = [(r.session_id, r.value) for r in self._rows("pr-duration")]
        self.assertEqual(rows, [(first.id, 60.0), (second.id, 120.0)])

    def test_equal_or_shorter_session_is_not_a_record(self):
        toy = self._create_toy("A")
        first = self._make_session(
            _utc("2026-06-01T10:00:00"), [{"toy": toy}], ended_at=_utc("2026-06-01T11:00:00")
        )
        record_session(first)
        equal = self._make_session(
            _utc("2026-06-02T10:00:00"), [{"toy": toy}], ended_at=_utc("2026-06-02T11:00:00")
        )
        record_session(equal)
        shorter = self._make_session(
            _utc("2026-06-03T10:00:00"), [{"toy": toy}], ended_at=_utc("2026-06-03T10:30:00")
        )
        record_session(shorter)

        rows = self._rows("pr-duration")
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].session_id, first.id)

    def test_open_sessions_never_record_a_duration(self):
        toy = self._create_toy("A")
        session = self._make_session(_utc("2026-06-01T10:00:00"), [{"toy": toy}])
        record_session(session)
        self.assertEqual(len(self._rows("pr-duration")), 0)

    def test_ending_a_session_records_its_duration_on_reevaluation(self):
        toy = self._create_toy("A")
        session = self._make_session(_utc("2026-06-01T10:00:00"), [{"toy": toy}])
        record_session(session)
        self.assertEqual(len(self._rows("pr-duration")), 0)

        session.ended_at = _utc("2026-06-01T10:45:00")
        session.save()
        record_session(session)

        rows = self._rows("pr-duration")
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].value, 45.0)


class LiveSessionRecordTests(RecordsTestBase):
    def _live_session(self, toy, duration=30):
        session = models.Session.objects.create(
            started_at=_utc("2026-06-01T10:00:00"), is_live=True
        )
        models.ToySessionEntry.objects.create(
            session=session, toy_id=toy, involvement="FULLY_INSERTED", duration_minutes=duration
        )
        return session

    def test_live_sessions_are_not_evaluated(self):
        toy = self._create_toy("A", circumference=220.0, insertable_length=170)
        session = self._live_session(toy)

        record_session(session)

        self.assertEqual(models.PersonalRecord.objects.count(), 0)

    def test_updating_a_live_session_creates_no_records(self):
        toy = self._create_toy("A", circumference=220.0, insertable_length=170)
        session = self._live_session(toy)

        response = self.client.patch(
            f"/toys/sessions/{session.id}/", {"started_at": "2026-06-01T09:00:00Z"}, format="json"
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["records"], [])
        self.assertEqual(models.PersonalRecord.objects.count(), 0)

    def test_ending_a_live_session_evaluates_all_records(self):
        toy = self._create_toy("A", circumference=220.0, insertable_length=170)
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
        ended = self._make_session(
            _utc("2026-06-02T10:00:00"), [{"toy": toy, "duration_minutes": 30}]
        )

        record_session(ended)

        rows = self._rows("toy-time")
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].session_id, ended.id)
        self.assertEqual(rows[0].value, 30.0)


class ToyRecordDriverTests(RecordsTestBase):
    def test_recording_a_session_sets_toy_records_with_the_toy_fk(self):
        toy = self._create_toy("A")
        session = self._make_session(
            _utc("2026-06-01T10:00:00"), [{"toy": toy, "duration_minutes": 30}]
        )

        record_session(session)

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
        toy = self._create_toy("A", circumference=220.0, insertable_length=170)
        session = self._make_session(_utc("2026-06-01T10:00:00"), [{"toy": toy}])

        record_session(session)

        self.assertIsNone(self._rows("pr-width")[0].toy_id)
        self.assertIsNone(self._rows("pr-depth")[0].toy_id)
        self.assertEqual(self._rows("toy-level")[0].toy_id, toy)

    def test_each_toy_in_a_session_gets_its_own_rows(self):
        toy_a = self._create_toy("A")
        toy_b = self._create_toy("B")
        session = self._make_session(
            _utc("2026-06-01T10:00:00"),
            [{"toy": toy_a, "duration_minutes": 10}, {"toy": toy_b, "duration_minutes": 90}],
        )

        record_session(session)

        time_rows = self._rows("toy-time")
        self.assertEqual({(r.toy_id, r.value) for r in time_rows}, {(toy_a, 10.0), (toy_b, 90.0)})
        for row in time_rows:
            self.assertEqual(row.toy_entry.toy_id, row.toy_id)

    def test_beating_the_toy_record_keeps_history_per_toy(self):
        toy_a = self._create_toy("A")
        toy_b = self._create_toy("B")
        first = self._make_session(
            _utc("2026-06-01T10:00:00"),
            [{"toy": toy_a, "duration_minutes": 30}, {"toy": toy_b, "duration_minutes": 60}],
        )
        record_session(first)

        second = self._make_session(
            _utc("2026-06-02T10:00:00"),
            [{"toy": toy_a, "duration_minutes": 45}, {"toy": toy_b, "duration_minutes": 50}],
        )
        record_session(second)

        rows = [(r.session_id, r.toy_id, r.value) for r in self._rows("toy-time")]
        self.assertEqual(
            rows, [(first.id, toy_a, 30.0), (first.id, toy_b, 60.0), (second.id, toy_a, 45.0)]
        )

    def test_no_level_row_without_a_level_up(self):
        toy = self._create_toy("A")
        first = self._make_session(
            _utc("2026-06-01T10:00:00"), [{"toy": toy, "involvement": "FULLY_INSERTED"}]
        )
        record_session(first)

        second = self._make_session(
            _utc("2026-06-02T10:00:00"), [{"toy": toy, "involvement": "FULLY_INSERTED"}]
        )
        record_session(second)

        level_rows = self._rows("toy-level")
        self.assertEqual(len(level_rows), 1)
        self.assertEqual(level_rows[0].session_id, first.id)

    def test_recording_the_same_session_twice_is_idempotent_for_toy_records(self):
        toy = self._create_toy("A")
        session = self._make_session(
            _utc("2026-06-01T10:00:00"), [{"toy": toy, "duration_minutes": 30}]
        )

        record_session(session)
        record_session(session)

        self.assertEqual(len(self._rows("toy-time")), 1)
        self.assertEqual(len(self._rows("toy-level")), 1)

    def test_rerecording_an_unchanged_session_keeps_the_original_rows(self):
        toy = self._create_toy("A")
        session = self._make_session(
            _utc("2026-06-01T10:00:00"), [{"toy": toy, "duration_minutes": 30}]
        )
        record_session(session)
        before = {(r.key, r.id, r.achieved_at) for r in models.PersonalRecord.objects.all()}

        record_session(session)

        after = {(r.key, r.id, r.achieved_at) for r in models.PersonalRecord.objects.all()}
        self.assertEqual(before, after)

    def test_editing_an_older_session_keeps_the_newest_row_as_the_standing_record(self):
        toy = self._create_toy("A")
        older = self._make_session(
            _utc("2026-06-01T10:00:00"), [{"toy": toy, "duration_minutes": 30}]
        )
        record_session(older)
        newer = self._make_session(
            _utc("2026-06-02T10:00:00"), [{"toy": toy, "duration_minutes": 45}]
        )
        record_session(newer)

        entry = older.entries.get()
        entry.involvement = "INSERTED"
        entry.save()
        record_session(older)

        time_rows = models.PersonalRecord.objects.filter(key="toy-time").order_by("-achieved_at")
        self.assertEqual([r.value for r in time_rows], [45.0, 30.0])
        self.assertEqual(time_rows[0].session_id, newer.id)

    def test_reevaluation_replaces_the_row_for_the_same_session_key_and_toy(self):
        toy = self._create_toy("A")
        session = self._make_session(
            _utc("2026-06-01T10:00:00"), [{"toy": toy, "duration_minutes": 30}]
        )
        record_session(session)

        entry = session.entries.get()
        entry.duration_minutes = 40
        entry.save()
        record_session(session)

        time_rows = self._rows("toy-time")
        self.assertEqual(len(time_rows), 1)
        self.assertEqual(time_rows[0].value, 40.0)

    def test_reevaluation_removes_the_row_when_the_entry_no_longer_qualifies(self):
        toy = self._create_toy("A")
        session = self._make_session(
            _utc("2026-06-01T10:00:00"), [{"toy": toy, "duration_minutes": 30}]
        )
        record_session(session)
        self.assertEqual(len(self._rows("toy-time")), 1)

        entry = session.entries.get()
        entry.duration_minutes = None
        entry.save()
        record_session(session)

        self.assertEqual(len(self._rows("toy-time")), 0)
        self.assertEqual(len(self._rows("toy-level")), 1)

    def test_backdated_session_uses_only_the_toy_sessions_before_it(self):
        toy = self._create_toy("A")
        later = self._make_session(
            _utc("2026-06-05T10:00:00"), [{"toy": toy, "duration_minutes": 45}]
        )
        record_session(later)

        backdated = self._make_session(
            _utc("2026-06-01T10:00:00"), [{"toy": toy, "duration_minutes": 60}]
        )
        record_session(backdated)

        rows = [(r.session_id, r.value) for r in self._rows("toy-time")]
        self.assertEqual(rows, [(later.id, 45.0), (backdated.id, 60.0)])


class RecordSessionTests(RecordsTestBase):
    def test_session_without_qualifying_entries_creates_no_rows(self):
        session = self._make_session(_utc("2026-06-01T10:00:00"))
        record_session(session)
        self.assertEqual(models.PersonalRecord.objects.count(), 0)

    def test_qualifying_session_sets_width_and_depth(self):
        toy = self._create_toy("A", circumference=220.0, insertable_length=170)
        session = self._make_session(_utc("2026-06-01T10:00:00"), [{"toy": toy}])

        record_session(session)

        width = self._rows("pr-width")
        depth = self._rows("pr-depth")
        self.assertEqual(len(width), 1)
        self.assertEqual(len(depth), 1)
        self.assertEqual(width[0].session_id, session.id)
        self.assertEqual(width[0].toy_entry.toy_id, toy)
        self.assertEqual(width[0].value, 220.0)
        self.assertIsNotNone(width[0].achieved_at)
        self.assertEqual(depth[0].session_id, session.id)
        self.assertEqual(depth[0].toy_entry.toy_id, toy)
        self.assertEqual(depth[0].value, 170.0)

    def test_recording_the_same_session_twice_is_idempotent(self):
        toy = self._create_toy("A")
        session = self._make_session(_utc("2026-06-01T10:00:00"), [{"toy": toy}])

        record_session(session)
        record_session(session)

        self.assertEqual(len(self._rows("pr-width")), 1)
        self.assertEqual(len(self._rows("pr-depth")), 1)

    def test_equal_value_does_not_create_a_new_row(self):
        toy = self._create_toy("A")
        first = self._make_session(_utc("2026-06-01T10:00:00"), [{"toy": toy}])
        record_session(first)

        second = self._make_session(_utc("2026-06-02T10:00:00"), [{"toy": toy}])
        record_session(second)

        self.assertEqual(len(self._rows("pr-width")), 1)
        self.assertEqual(len(self._rows("pr-depth")), 1)

    def test_bigger_value_creates_a_new_row_and_keeps_history(self):
        toy_a = self._create_toy("A", circumference=220.0, insertable_length=170)
        first = self._make_session(_utc("2026-06-01T10:00:00"), [{"toy": toy_a}])
        record_session(first)

        toy_b = self._create_toy("B", circumference=240.0, insertable_length=190)
        second = self._make_session(_utc("2026-06-02T10:00:00"), [{"toy": toy_b}])
        record_session(second)

        width = self._rows("pr-width")
        self.assertEqual(len(width), 2)
        self.assertEqual(width[0].session_id, first.id)
        self.assertEqual(width[0].value, 220.0)
        self.assertEqual(width[1].session_id, second.id)
        self.assertEqual(width[1].toy_entry.toy_id, toy_b)
        self.assertEqual(width[1].value, 240.0)

        depth = self._rows("pr-depth")
        self.assertEqual(len(depth), 2)
        self.assertEqual(depth[1].value, 190.0)


class RecordGatingTests(RecordsTestBase):
    def test_used_entries_set_no_session_records_but_do_set_toy_records(self):
        toy = self._create_toy("A")
        session = self._make_session(
            _utc("2026-06-01T10:00:00"), [{"toy": toy, "involvement": "USED"}]
        )
        record_session(session)
        self.assertEqual(len(self._rows("pr-width")), 0)
        self.assertEqual(len(self._rows("pr-depth")), 0)

        level_rows = self._rows("toy-level")
        self.assertEqual(len(level_rows), 1)
        self.assertEqual(level_rows[0].toy_id, toy)
        self.assertEqual(level_rows[0].value, 0.0)

    def test_inserted_sets_width_but_not_depth(self):
        toy = self._create_toy("A")
        session = self._make_session(
            _utc("2026-06-01T10:00:00"), [{"toy": toy, "involvement": "INSERTED"}]
        )
        record_session(session)
        self.assertEqual(len(self._rows("pr-width")), 1)
        self.assertEqual(len(self._rows("pr-depth")), 0)

    def test_toys_without_dimensions_set_no_session_records(self):
        toy = self._create_toy("A", circumference=None, insertable_length=None)
        session = self._make_session(_utc("2026-06-01T10:00:00"), [{"toy": toy}])
        record_session(session)
        self.assertEqual(len(self._rows("pr-width")), 0)
        self.assertEqual(len(self._rows("pr-depth")), 0)

    def test_equal_value_on_one_key_still_evaluates_the_others(self):
        toy = self._create_toy("A")
        session = self._make_session(
            _utc("2026-06-01T10:00:00"), [{"toy": toy, "involvement": "INSERTED"}]
        )
        record_session(session)
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
        session = self._make_session(
            _utc("2026-06-01T10:00:00"), [{"toy": toy, "involvement": "INSERTED"}]
        )
        record_session(session)
        self.assertEqual(len(self._rows("pr-width")), 1)

        entry = session.entries.get()
        entry.involvement = "USED"
        entry.save()
        record_session(session)

        self.assertEqual(len(self._rows("pr-width")), 0)

    def test_attribution_goes_to_the_qualifying_entry(self):
        toy_used = self._create_toy("Used", circumference=240.0, insertable_length=190)
        toy_inserted = self._create_toy("Inserted", circumference=240.0, insertable_length=190)
        session = self._make_session(
            _utc("2026-06-01T10:00:00"),
            [
                {"toy": toy_used, "involvement": "USED"},
                {"toy": toy_inserted, "involvement": "INSERTED"},
            ],
        )
        record_session(session)

        width = self._rows("pr-width")
        self.assertEqual(len(width), 1)
        self.assertEqual(width[0].toy_entry.toy_id, toy_inserted)

    def test_deleting_the_record_holder_leaves_the_older_row_standing(self):
        toy_a = self._create_toy("A", circumference=220.0, insertable_length=170)
        first = self._make_session(_utc("2026-06-01T10:00:00"), [{"toy": toy_a}])
        record_session(first)

        toy_b = self._create_toy("B", circumference=240.0, insertable_length=190)
        second = self._make_session(_utc("2026-06-02T10:00:00"), [{"toy": toy_b}])
        record_session(second)
        self.assertEqual(len(self._rows("pr-width")), 2)

        second.delete()
        self.assertEqual(len(self._rows("pr-width")), 1)

        third = self._make_session(_utc("2026-06-03T10:00:00"), [{"toy": toy_a}])
        record_session(third)

        width = self._rows("pr-width")
        self.assertEqual(len(width), 1)
        self.assertEqual(width[0].session_id, first.id)
        self.assertEqual(width[0].value, 220.0)


class RecordApiTests(RecordsTestBase):
    def _payload(self, entries, started_at="2026-06-01T10:00:00Z"):
        return {"started_at": started_at, "entries": entries}

    def _post_session(self, entries, started_at="2026-06-01T10:00:00Z"):
        response = self.client.post(
            "/toys/sessions/", self._payload(entries, started_at), format="json"
        )
        self.assertEqual(response.status_code, 201, response.content)
        return response.data

    def _records_by_key(self, data):
        return {r["key"]: r for r in data["records"]}

    def test_post_evaluates_records_and_embeds_them_in_the_response(self):
        toy = self._create_toy("A", circumference=220.0, insertable_length=170)
        data = self._post_session([{"toy": toy, "involvement": "FULLY_INSERTED"}])

        recs = self._records_by_key(data)
        self.assertEqual(set(recs), {"pr-width", "pr-depth", "toy-level"})
        self.assertEqual(recs["pr-width"]["toy"], toy)
        self.assertEqual(recs["pr-width"]["value"], 220.0)
        self.assertIsNotNone(recs["pr-width"]["achieved_at"])
        self.assertEqual(recs["pr-depth"]["value"], 170.0)
        self.assertEqual(recs["toy-level"]["toy"], toy)
        self.assertEqual(models.PersonalRecord.objects.filter(session_id=data["id"]).count(), 3)

    def test_post_with_durations_embeds_the_plugged_time_record(self):
        toy = self._create_toy("A", circumference=220.0, insertable_length=170)
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

        toy_b = self._create_toy("B", circumference=220.0, insertable_length=170)
        data = self._post_session(
            [{"toy": toy_b, "involvement": "FULLY_INSERTED"}], "2026-06-02T10:00:00Z"
        )
        self.assertEqual(set(self._records_by_key(data)), {"toy-level"})

    def test_backdated_session_is_evaluated_against_earlier_sessions_only(self):
        toy_big = self._create_toy("Big", circumference=240.0, insertable_length=190)
        later = self._post_session(
            [{"toy": toy_big, "involvement": "FULLY_INSERTED"}], "2026-06-05T10:00:00Z"
        )

        toy_small = self._create_toy("Small", circumference=220.0, insertable_length=170)
        backdated = self._post_session(
            [{"toy": toy_small, "involvement": "FULLY_INSERTED"}], "2026-06-01T10:00:00Z"
        )

        recs = self._records_by_key(backdated)
        self.assertEqual(recs["pr-width"]["value"], 220.0)
        self.assertEqual(recs["pr-depth"]["value"], 170.0)
        self.assertEqual(models.PersonalRecord.objects.filter(session_id=later["id"]).count(), 3)
        self.assertEqual(models.PersonalRecord.objects.count(), 6)

    def test_list_and_detail_embed_records_on_the_owning_session(self):
        toy_a = self._create_toy("A", circumference=220.0, insertable_length=170)
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
        toy_a = self._create_toy("A", circumference=220.0, insertable_length=170)
        data = self._post_session([{"toy": toy_a, "involvement": "FULLY_INSERTED"}])

        toy_b = self._create_toy("B", circumference=240.0, insertable_length=190)
        response = self.client.put(
            f"/toys/sessions/{data['id']}/",
            self._payload([{"toy": toy_b, "involvement": "FULLY_INSERTED"}]),
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

        recs = self._records_by_key(response.data)
        self.assertEqual(recs["pr-width"]["toy"], toy_b)
        self.assertEqual(recs["pr-width"]["value"], 240.0)
        self.assertEqual(models.PersonalRecord.objects.filter(session_id=data["id"]).count(), 3)

    def test_update_that_disqualifies_removes_the_rows(self):
        toy = self._create_toy("A", circumference=220.0, insertable_length=170)
        data = self._post_session([{"toy": toy, "involvement": "FULLY_INSERTED"}])
        self.assertEqual(models.PersonalRecord.objects.count(), 3)

        response = self.client.put(
            f"/toys/sessions/{data['id']}/",
            self._payload([{"toy": toy, "involvement": "USED"}]),
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        recs = self._records_by_key(response.data)
        self.assertEqual(set(recs), {"toy-level"})
        self.assertEqual(recs["toy-level"]["value"], 0.0)
        self.assertEqual(len(self._rows("pr-width")), 0)
        self.assertEqual(len(self._rows("pr-depth")), 0)

    def test_start_time_only_patch_keeps_the_records(self):
        toy = self._create_toy("A", circumference=220.0, insertable_length=170)
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
        session = self._make_session(_utc("2026-06-01T10:00:00"), [{"toy": toy}])

        listed = self.client.get("/toys/sessions/")
        self.assertEqual(listed.status_code, 200, listed.content)
        detail = self.client.get(f"/toys/sessions/{session.id}/")
        self.assertEqual(detail.status_code, 200, detail.content)

        self.assertEqual(models.PersonalRecord.objects.count(), 0)
        self.assertEqual(detail.data["records"], [])


class ResyncTests(RecordsTestBase):
    def test_resync_rebuilds_history_chronologically(self):
        toy_a = self._create_toy("A", circumference=220.0, insertable_length=170)
        toy_b = self._create_toy("B", circumference=240.0, insertable_length=190)
        toy_c = self._create_toy("C", circumference=230.0, insertable_length=180)
        first = self._make_session(_utc("2026-06-01T10:00:00"), [{"toy": toy_a}])
        second = self._make_session(_utc("2026-06-02T10:00:00"), [{"toy": toy_b}])
        self._make_session(_utc("2026-06-03T10:00:00"), [{"toy": toy_c}])

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
        toy = self._create_toy("A", circumference=220.0, insertable_length=170)
        session = self._make_session(_utc("2026-06-01T10:00:00"), [{"toy": toy}])
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
        self._make_session(_utc("2026-06-01T10:00:00"), [{"toy": toy}])
        resync_records()
        resync_records()

        self.assertEqual(len(self._rows("pr-width")), 1)
        self.assertEqual(len(self._rows("pr-depth")), 1)

    def test_resync_skips_live_sessions(self):
        toy = self._create_toy("A")
        live = models.Session.objects.create(started_at=_utc("2026-06-01T10:00:00"), is_live=True)
        models.ToySessionEntry.objects.create(
            session=live, toy_id=toy, involvement="FULLY_INSERTED", duration_minutes=90
        )
        ended = self._make_session(
            _utc("2026-06-02T10:00:00"), [{"toy": toy, "duration_minutes": 30}]
        )

        resync_records()

        self.assertEqual(models.PersonalRecord.objects.filter(session=live).count(), 0)
        time_rows = self._rows("toy-time")
        self.assertEqual(len(time_rows), 1)
        self.assertEqual(time_rows[0].session_id, ended.id)

    def test_rebuild_endpoint_resyncs_and_reports_the_row_count(self):
        toy_a = self._create_toy("A", circumference=220.0, insertable_length=170)
        toy_b = self._create_toy("B", circumference=240.0, insertable_length=190)
        self._make_session(_utc("2026-06-01T10:00:00"), [{"toy": toy_a}])
        self._make_session(_utc("2026-06-02T10:00:00"), [{"toy": toy_b}])

        response = self.client.post("/toys/sessions/rebuild-records/")

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data, {"records": 6})
        self.assertEqual(models.PersonalRecord.objects.count(), 6)
        self.assertEqual(len(self._rows("pr-width")), 2)
        self.assertEqual(len(self._rows("toy-level")), 2)
