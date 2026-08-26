from . import models, records
from .testutils import SessionApiTestBase
from .testutils import utc as _utc


class RecordsTestBase(SessionApiTestBase):
    default_involvement = "FULLY_INSERTED"

    def _rows(self, key):
        return list(models.PersonalRecord.objects.filter(key=key).order_by("id"))


class RecordRegistryTests(RecordsTestBase):
    def test_duplicate_key_registration_raises(self):
        with self.assertRaises(records.DuplicateRecordKey):
            records.record("pr-width")(lambda ctx: None)

    def test_seed_definitions_are_registered(self):
        self.assertIn("pr-width", records.RECORD_DEFINITIONS)
        self.assertIn("pr-depth", records.RECORD_DEFINITIONS)


class RecordSessionTests(RecordsTestBase):
    def test_session_without_qualifying_entries_creates_no_rows(self):
        session = self._make_session(_utc("2026-06-01T10:00:00"))
        records.record_session(session)
        self.assertEqual(models.PersonalRecord.objects.count(), 0)

    def test_qualifying_session_sets_width_and_depth(self):
        toy = self._create_toy("A", circumference=220.0, insertable_length=170)
        session = self._make_session(_utc("2026-06-01T10:00:00"), [{"toy": toy}])

        records.record_session(session)

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

        records.record_session(session)
        records.record_session(session)

        self.assertEqual(len(self._rows("pr-width")), 1)
        self.assertEqual(len(self._rows("pr-depth")), 1)

    def test_equal_value_does_not_create_a_new_row(self):
        toy = self._create_toy("A")
        first = self._make_session(_utc("2026-06-01T10:00:00"), [{"toy": toy}])
        records.record_session(first)

        second = self._make_session(_utc("2026-06-02T10:00:00"), [{"toy": toy}])
        records.record_session(second)

        self.assertEqual(len(self._rows("pr-width")), 1)
        self.assertEqual(len(self._rows("pr-depth")), 1)

    def test_bigger_value_creates_a_new_row_and_keeps_history(self):
        toy_a = self._create_toy("A", circumference=220.0, insertable_length=170)
        first = self._make_session(_utc("2026-06-01T10:00:00"), [{"toy": toy_a}])
        records.record_session(first)

        toy_b = self._create_toy("B", circumference=240.0, insertable_length=190)
        second = self._make_session(_utc("2026-06-02T10:00:00"), [{"toy": toy_b}])
        records.record_session(second)

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
    def test_used_entries_set_no_records(self):
        toy = self._create_toy("A")
        session = self._make_session(
            _utc("2026-06-01T10:00:00"), [{"toy": toy, "involvement": "USED"}]
        )
        records.record_session(session)
        self.assertEqual(models.PersonalRecord.objects.count(), 0)

    def test_inserted_sets_width_but_not_depth(self):
        toy = self._create_toy("A")
        session = self._make_session(
            _utc("2026-06-01T10:00:00"), [{"toy": toy, "involvement": "INSERTED"}]
        )
        records.record_session(session)
        self.assertEqual(len(self._rows("pr-width")), 1)
        self.assertEqual(len(self._rows("pr-depth")), 0)

    def test_toys_without_dimensions_are_skipped(self):
        toy = self._create_toy("A", circumference=None, insertable_length=None)
        session = self._make_session(_utc("2026-06-01T10:00:00"), [{"toy": toy}])
        records.record_session(session)
        self.assertEqual(models.PersonalRecord.objects.count(), 0)

    def test_equal_value_on_one_key_still_evaluates_the_others(self):
        toy = self._create_toy("A")
        session = self._make_session(
            _utc("2026-06-01T10:00:00"), [{"toy": toy, "involvement": "INSERTED"}]
        )
        records.record_session(session)
        self.assertEqual(len(self._rows("pr-width")), 1)
        self.assertEqual(len(self._rows("pr-depth")), 0)

        entry = session.entries.get()
        entry.involvement = "FULLY_INSERTED"
        entry.save()
        records.record_session(session)

        self.assertEqual(len(self._rows("pr-width")), 1)
        self.assertEqual(len(self._rows("pr-depth")), 1)

    def test_stale_row_removed_when_session_no_longer_qualifies(self):
        toy = self._create_toy("A")
        session = self._make_session(
            _utc("2026-06-01T10:00:00"), [{"toy": toy, "involvement": "INSERTED"}]
        )
        records.record_session(session)
        self.assertEqual(len(self._rows("pr-width")), 1)

        entry = session.entries.get()
        entry.involvement = "USED"
        entry.save()
        records.record_session(session)

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
        records.record_session(session)

        width = self._rows("pr-width")
        self.assertEqual(len(width), 1)
        self.assertEqual(width[0].toy_entry.toy_id, toy_inserted)

    def test_deleting_the_record_holder_leaves_the_older_row_standing(self):
        toy_a = self._create_toy("A", circumference=220.0, insertable_length=170)
        first = self._make_session(_utc("2026-06-01T10:00:00"), [{"toy": toy_a}])
        records.record_session(first)

        toy_b = self._create_toy("B", circumference=240.0, insertable_length=190)
        second = self._make_session(_utc("2026-06-02T10:00:00"), [{"toy": toy_b}])
        records.record_session(second)
        self.assertEqual(len(self._rows("pr-width")), 2)

        second.delete()
        self.assertEqual(len(self._rows("pr-width")), 1)

        third = self._make_session(_utc("2026-06-03T10:00:00"), [{"toy": toy_a}])
        records.record_session(third)

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
        self.assertEqual(set(recs), {"pr-width", "pr-depth"})
        self.assertEqual(recs["pr-width"]["toy"], toy)
        self.assertEqual(recs["pr-width"]["value"], 220.0)
        self.assertIsNotNone(recs["pr-width"]["achieved_at"])
        self.assertEqual(recs["pr-depth"]["value"], 170.0)
        self.assertEqual(models.PersonalRecord.objects.filter(session_id=data["id"]).count(), 2)

    def test_session_below_the_record_gets_no_records(self):
        toy_a = self._create_toy("A", circumference=240.0, insertable_length=190)
        self._post_session([{"toy": toy_a, "involvement": "FULLY_INSERTED"}])

        toy_b = self._create_toy("B", circumference=220.0, insertable_length=170)
        data = self._post_session(
            [{"toy": toy_b, "involvement": "FULLY_INSERTED"}], "2026-06-02T10:00:00Z"
        )
        self.assertEqual(data["records"], [])

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
        self.assertEqual(models.PersonalRecord.objects.filter(session_id=later["id"]).count(), 2)
        self.assertEqual(models.PersonalRecord.objects.count(), 4)

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
        self.assertEqual(models.PersonalRecord.objects.filter(session_id=data["id"]).count(), 2)

    def test_update_that_disqualifies_removes_the_rows(self):
        toy = self._create_toy("A", circumference=220.0, insertable_length=170)
        data = self._post_session([{"toy": toy, "involvement": "FULLY_INSERTED"}])
        self.assertEqual(models.PersonalRecord.objects.count(), 2)

        response = self.client.put(
            f"/toys/sessions/{data['id']}/",
            self._payload([{"toy": toy, "involvement": "USED"}]),
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["records"], [])
        self.assertEqual(models.PersonalRecord.objects.count(), 0)

    def test_start_time_only_patch_keeps_the_records(self):
        toy = self._create_toy("A", circumference=220.0, insertable_length=170)
        data = self._post_session([{"toy": toy, "involvement": "FULLY_INSERTED"}])

        response = self.client.patch(
            f"/toys/sessions/{data['id']}/",
            {"started_at": "2026-06-01T09:00:00Z"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(set(self._records_by_key(response.data)), {"pr-width", "pr-depth"})

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

        records.resync_records()

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

        records.resync_records()

        width = self._rows("pr-width")
        self.assertEqual(len(width), 1)
        self.assertEqual(width[0].value, 220.0)
        self.assertEqual(len(self._rows("pr-depth")), 1)

    def test_resync_is_idempotent_and_safe_on_empty_data(self):
        records.resync_records()
        self.assertEqual(models.PersonalRecord.objects.count(), 0)

        toy = self._create_toy("A")
        self._make_session(_utc("2026-06-01T10:00:00"), [{"toy": toy}])
        records.resync_records()
        records.resync_records()

        self.assertEqual(len(self._rows("pr-width")), 1)
        self.assertEqual(len(self._rows("pr-depth")), 1)

    def test_rebuild_endpoint_resyncs_and_reports_the_row_count(self):
        toy_a = self._create_toy("A", circumference=220.0, insertable_length=170)
        toy_b = self._create_toy("B", circumference=240.0, insertable_length=190)
        self._make_session(_utc("2026-06-01T10:00:00"), [{"toy": toy_a}])
        self._make_session(_utc("2026-06-02T10:00:00"), [{"toy": toy_b}])

        response = self.client.post("/toys/sessions/rebuild-records/")

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data, {"records": 4})
        self.assertEqual(models.PersonalRecord.objects.count(), 4)
