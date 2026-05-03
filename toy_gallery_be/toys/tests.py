from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from . import export as export_mod
from . import models
from .dimensions import ShapeDimensions


def _payload(*, section_circumferences=(220.0, 180.0, None)):
    return {
        "brand": "Acme",
        "name": "Demo",
        "size": "M",
        "color": "#c4b5fd",
        "insertable_length": 170,
        "shape": {
            "top_section_shape": "EGG",
            "sections": [
                {"order": idx, "diameter": 70, "height": 30, "circumference": c}
                for idx, c in enumerate(section_circumferences)
            ],
        },
    }


class DimensionsShapeTests(TestCase):
    def setUp(self):
        self.shape = models.Shape.objects.create(top_section_shape=models.Shape.EGG)

    def test_circumference_max_across_set_values(self):
        models.ShapeSection.objects.create(
            shape=self.shape, order=0, diameter=50, height=30, circumference=160
        )
        models.ShapeSection.objects.create(
            shape=self.shape, order=1, diameter=90, height=40, circumference=300
        )
        self.assertEqual(ShapeDimensions.circumference(self.shape), 300)

    def test_circumference_ignores_nulls(self):
        models.ShapeSection.objects.create(
            shape=self.shape, order=0, diameter=50, height=30, circumference=None
        )
        models.ShapeSection.objects.create(
            shape=self.shape, order=1, diameter=90, height=40, circumference=250
        )
        self.assertEqual(ShapeDimensions.circumference(self.shape), 250)

    def test_circumference_none_when_all_null(self):
        models.ShapeSection.objects.create(
            shape=self.shape, order=0, diameter=50, height=30, circumference=None
        )
        self.assertIsNone(ShapeDimensions.circumference(self.shape))

    def test_height_is_sum_and_diameter_is_max(self):
        models.ShapeSection.objects.create(
            shape=self.shape, order=0, diameter=50, height=30, circumference=160
        )
        models.ShapeSection.objects.create(
            shape=self.shape, order=1, diameter=90, height=40, circumference=300
        )
        self.assertEqual(ShapeDimensions.height(self.shape), 70)
        self.assertEqual(ShapeDimensions.diameter(self.shape), 90)

class ToyCreateTests(TestCase):
    def setUp(self):
        user = User.objects.create_user(username="u", password="p")
        self.client = APIClient()
        self.client.force_authenticate(user=user)

    def test_create_succeeds_with_one_section_circumference(self):
        response = self.client.post(
            "/toys/toys/",
            _payload(section_circumferences=(None, 220.0, None)),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.data["insertable_length"], 170)
        self.assertEqual(response.data["circumference"], 220.0)

    def test_create_rejects_when_no_section_has_circumference(self):
        response = self.client.post(
            "/toys/toys/",
            _payload(section_circumferences=(None, None, None)),
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("sections", str(response.content))

    def test_response_has_scalar_mm_dimensions(self):
        response = self.client.post(
            "/toys/toys/",
            _payload(section_circumferences=(None, 220.0, None)),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        data = response.data
        for field in ("height", "diameter", "circumference", "insertable_length"):
            self.assertIsInstance(data[field], (int, float), field)
        for section in data["shape"]["sections"]:
            for field in ("height", "diameter"):
                self.assertIsInstance(section[field], (int, float), field)
        null_sections = [s for s in data["shape"]["sections"] if s["circumference"] is None]
        self.assertTrue(null_sections)


class CustomAttributesTests(TestCase):
    def setUp(self):
        user = User.objects.create_user(username="u", password="p")
        self.client = APIClient()
        self.client.force_authenticate(user=user)

    def _create_toy(self, **extra):
        payload = _payload(section_circumferences=(None, 220.0, None))
        payload.update(extra)
        response = self.client.post("/toys/toys/", payload, format="json")
        self.assertEqual(response.status_code, 201, response.content)
        return response.data

    def test_create_round_trips_custom_attributes(self):
        data = self._create_toy(custom_attributes={"firmness": "medium", "price": "99.00"})
        self.assertEqual(data["custom_attributes"], {"firmness": "medium", "price": "99.00"})

    def test_default_is_empty_dict(self):
        data = self._create_toy()
        self.assertEqual(data["custom_attributes"], {})

    def test_patch_replaces_custom_attributes_without_touching_other_fields(self):
        created = self._create_toy(custom_attributes={"firmness": "medium"})
        toy_id = created["id"]
        response = self.client.patch(
            f"/toys/toys/{toy_id}/",
            {"custom_attributes": {"material": "silicone"}},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["custom_attributes"], {"material": "silicone"})
        self.assertEqual(response.data["brand"], created["brand"])
        self.assertEqual(response.data["name"], created["name"])

    def test_nested_structure_values_are_rejected(self):
        payload = _payload(section_circumferences=(None, 220.0, None))
        payload["custom_attributes"] = {"tags": ["a", "b"]}
        response = self.client.post("/toys/toys/", payload, format="json")
        self.assertEqual(response.status_code, 400, response.content)
        self.assertIn("custom_attributes", response.data)

    def test_empty_keys_are_stripped_and_keys_are_trimmed(self):
        data = self._create_toy(
            custom_attributes={
                "firmness": "medium",
                "color": "",
                "": "orphan",
                " padded ": "yes",
            }
        )
        self.assertEqual(
            data["custom_attributes"],
            {"firmness": "medium", "color": "", "padded": "yes"},
        )

    def test_patch_with_empty_value_keeps_the_key(self):
        created = self._create_toy(custom_attributes={"firmness": "medium"})
        response = self.client.patch(
            f"/toys/toys/{created['id']}/",
            {"custom_attributes": {"firmness": ""}},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["custom_attributes"], {"firmness": ""})


class ExportRegistryTests(TestCase):
    def test_latest_returns_highest_version(self):
        self.assertIs(export_mod.latest(), export_mod.ExportV2)

    def test_for_version_returns_handler(self):
        self.assertIs(export_mod.for_version(1), export_mod.ExportV1)
        self.assertIs(export_mod.for_version(2), export_mod.ExportV2)

    def test_for_version_rejects_unknown(self):
        from rest_framework.exceptions import ValidationError

        with self.assertRaises(ValidationError):
            export_mod.for_version(99)

    def test_for_version_rejects_non_int(self):
        from rest_framework.exceptions import ValidationError

        with self.assertRaises(ValidationError):
            export_mod.for_version("1")


class ExportImportTests(TestCase):
    def setUp(self):
        user = User.objects.create_user(username="u", password="p")
        self.client = APIClient()
        self.client.force_authenticate(user=user)
        # Seed one toy so the export has content.
        self.client.post(
            "/toys/toys/",
            _payload(section_circumferences=(None, 220.0, None)),
            format="json",
        )

    def test_export_has_envelope_and_portable_toy_shape(self):
        response = self.client.get("/toys/toys/export/")
        self.assertEqual(response.status_code, 200, response.content)
        data = response.data
        self.assertEqual(data["version"], 2)
        self.assertIn("exported_at", data)
        self.assertIn("sessions", data)
        self.assertEqual(len(data["toys"]), 1)
        toy = data["toys"][0]
        # Scalar mm shape (NOT the {mm, in} dict).
        self.assertEqual(toy["brand"], "Acme")
        self.assertEqual(toy["insertable_length"], 170)
        self.assertEqual(toy["_id"], 0)
        section = toy["shape"]["sections"][1]
        self.assertEqual(section["circumference"], 220.0)
        self.assertNotIsInstance(section["height"], dict)

    def test_export_round_trips_custom_attributes(self):
        with_attrs = _payload(section_circumferences=(None, 220.0, None))
        with_attrs["custom_attributes"] = {"firmness": "medium", "material": "silicone"}
        self.client.post("/toys/toys/", with_attrs, format="json")

        exported = self.client.get("/toys/toys/export/").data
        attrs_by_name = {t["name"]: t.get("custom_attributes") for t in exported["toys"]}
        self.assertEqual(
            attrs_by_name["Demo"], {"firmness": "medium", "material": "silicone"}
        )

        # Import the export and verify the round-tripped toy keeps its attributes.
        models.Toy.objects.all().delete()
        response = self.client.post("/toys/toys/import/", exported, format="json")
        self.assertEqual(response.status_code, 201, response.content)
        roundtripped = list(
            models.Toy.objects.filter(custom_attributes__has_key="firmness")
        )
        self.assertEqual(len(roundtripped), 1)
        self.assertEqual(
            roundtripped[0].custom_attributes,
            {"firmness": "medium", "material": "silicone"},
        )

    def test_export_download_headers(self):
        response = self.client.get("/toys/toys/export/")
        disposition = response["Content-Disposition"]
        self.assertIn("attachment", disposition)
        self.assertIn("toy-gallery-", disposition)
        self.assertIn(".json", disposition)

    def test_import_is_additive(self):
        # Export what's there, import it back, count should double.
        exported = self.client.get("/toys/toys/export/").data
        before = models.Toy.objects.count()
        response = self.client.post(
            "/toys/toys/import/", exported, format="json"
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.data, {"toys_created": before, "sessions_created": 0})
        self.assertEqual(models.Toy.objects.count(), before * 2)

    def test_import_rejects_missing_version(self):
        response = self.client.post("/toys/toys/import/", {"toys": []}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_import_rejects_unknown_version(self):
        response = self.client.post(
            "/toys/toys/import/",
            {"version": 99, "toys": []},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("99", str(response.content))

    def test_import_is_atomic(self):
        # Build an envelope where the second toy is invalid (all-null circ).
        good = _payload(section_circumferences=(None, 200.0, None))
        bad = _payload(section_circumferences=(None, None, None))
        envelope = {"version": 1, "exported_at": "x", "toys": [good, bad]}
        before = models.Toy.objects.count()
        response = self.client.post("/toys/toys/import/", envelope, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(models.Toy.objects.count(), before)


class ExportV2SessionsTests(TestCase):
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

    def _create_session(self, entries, started_at="2026-04-01T10:00:00Z"):
        response = self.client.post(
            "/toys/sessions/",
            {"started_at": started_at, "entries": entries},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        return response.data["id"]

    def test_v2_round_trip_includes_sessions(self):
        self._create_session(
            [
                {"toy": self.toy_a, "involvement": "FULLY_INSERTED"},
                {"toy": self.toy_b, "involvement": "USED"},
            ],
            started_at="2026-04-01T10:00:00Z",
        )
        exported = self.client.get("/toys/toys/export/").data
        self.assertEqual(exported["version"], 2)
        self.assertEqual(len(exported["sessions"]), 1)
        local_ids = {t["_id"] for t in exported["toys"]}
        self.assertEqual(local_ids, {0, 1})
        for entry in exported["sessions"][0]["entries"]:
            self.assertIn(entry["toy_id"], local_ids)

        models.Session.objects.all().delete()
        models.Toy.objects.all().delete()

        response = self.client.post("/toys/toys/import/", exported, format="json")
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(
            response.data, {"toys_created": 2, "sessions_created": 1}
        )
        self.assertEqual(models.Toy.objects.count(), 2)
        self.assertEqual(models.Session.objects.count(), 1)
        session = models.Session.objects.get()
        involvements = {e.involvement for e in session.entries.all()}
        self.assertEqual(involvements, {"FULLY_INSERTED", "USED"})
        toy_names = {e.toy.name for e in session.entries.all()}
        self.assertEqual(toy_names, {"A", "B"})

    def test_v2_import_rejects_unknown_toy_id_in_session_entry(self):
        envelope = {
            "version": 2,
            "exported_at": "x",
            "toys": [
                {**_payload(section_circumferences=(None, 200.0, None)), "_id": 0},
            ],
            "sessions": [
                {
                    "started_at": "2026-04-01T10:00:00Z",
                    "entries": [{"toy_id": 99, "involvement": "USED"}],
                }
            ],
        }
        before_toys = models.Toy.objects.count()
        before_sessions = models.Session.objects.count()
        response = self.client.post("/toys/toys/import/", envelope, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(models.Toy.objects.count(), before_toys)
        self.assertEqual(models.Session.objects.count(), before_sessions)

    def test_v1_envelope_still_imports_under_v2_codepath(self):
        envelope = {
            "version": 1,
            "exported_at": "x",
            "toys": [_payload(section_circumferences=(None, 200.0, None))],
        }
        response = self.client.post("/toys/toys/import/", envelope, format="json")
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(
            response.data, {"toys_created": 1, "sessions_created": 0}
        )


class DeleteCollectionTests(TestCase):
    def setUp(self):
        user = User.objects.create_user(username="u", password="p")
        self.client = APIClient()
        self.client.force_authenticate(user=user)

    def _create_toy(self, name="Demo"):
        payload = _payload(section_circumferences=(None, 220.0, None))
        payload["name"] = name
        response = self.client.post("/toys/toys/", payload, format="json")
        self.assertEqual(response.status_code, 201, response.content)
        return response.data["id"]

    def test_wipes_toys_and_sessions(self):
        toy_a = self._create_toy("A")
        toy_b = self._create_toy("B")
        self.client.post(
            "/toys/sessions/",
            {
                "started_at": "2026-04-01T10:00:00Z",
                "entries": [
                    {"toy": toy_a, "involvement": "FULLY_INSERTED"},
                    {"toy": toy_b, "involvement": "USED"},
                ],
            },
            format="json",
        )

        response = self.client.delete("/toys/toys/delete_all/")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data, {"toys_deleted": 2, "sessions_deleted": 1})
        self.assertEqual(models.Toy.objects.count(), 0)
        self.assertEqual(models.Session.objects.count(), 0)
        self.assertEqual(models.ToySessionEntry.objects.count(), 0)
        self.assertEqual(models.Shape.objects.count(), 0)
        self.assertEqual(models.ShapeSection.objects.count(), 0)

    def test_empty_collection_returns_zero_counts(self):
        response = self.client.delete("/toys/toys/delete_all/")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data, {"toys_deleted": 0, "sessions_deleted": 0})


class SessionTests(TestCase):
    def setUp(self):
        user = User.objects.create_user(username="u", password="p")
        self.client = APIClient()
        self.client.force_authenticate(user=user)
        # Seed two toys to attach to sessions.
        self.toy_a = self._create_toy(name="A")
        self.toy_b = self._create_toy(name="B")

    def _create_toy(self, name):
        payload = _payload(section_circumferences=(None, 220.0, None))
        payload["name"] = name
        response = self.client.post("/toys/toys/", payload, format="json")
        self.assertEqual(response.status_code, 201, response.content)
        return response.data["id"]

    def _session_payload(self, entries, started_at="2026-05-02T21:14:00Z"):
        return {"started_at": started_at, "entries": entries}

    def test_used_contributes_neither_length_nor_circumference(self):
        response = self.client.post(
            "/toys/sessions/",
            self._session_payload([{"toy": self.toy_a, "involvement": "USED"}]),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertIsNone(response.data["max_insertable_length"])
        self.assertIsNone(response.data["max_circumference"])

    def test_inserted_contributes_circumference_but_not_length(self):
        # toy_a has insertable_length=170, max section circumference=220.
        response = self.client.post(
            "/toys/sessions/",
            self._session_payload([{"toy": self.toy_a, "involvement": "INSERTED"}]),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertIsNone(response.data["max_insertable_length"])
        self.assertEqual(response.data["max_circumference"], 220)

    def test_fully_inserted_contributes_both(self):
        response = self.client.post(
            "/toys/sessions/",
            self._session_payload(
                [{"toy": self.toy_a, "involvement": "FULLY_INSERTED"}]
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.data["max_insertable_length"], 170)
        self.assertEqual(response.data["max_circumference"], 220)

    def test_peak_length_only_from_fully_inserted_when_mixed(self):
        # toy_a INSERTED → contributes circ but not length.
        # toy_b FULLY_INSERTED → contributes both. Length should come from
        # toy_b alone; circumference is a tie at 220.
        response = self.client.post(
            "/toys/sessions/",
            self._session_payload(
                [
                    {"toy": self.toy_a, "involvement": "INSERTED"},
                    {"toy": self.toy_b, "involvement": "FULLY_INSERTED"},
                ]
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.data["max_insertable_length"], 170)
        self.assertEqual(response.data["max_circumference"], 220)

    def test_used_and_fully_inserted_drops_used(self):
        response = self.client.post(
            "/toys/sessions/",
            self._session_payload(
                [
                    {"toy": self.toy_a, "involvement": "USED"},
                    {"toy": self.toy_b, "involvement": "FULLY_INSERTED"},
                ]
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.data["max_insertable_length"], 170)
        self.assertEqual(response.data["max_circumference"], 220)

    def test_create_with_mixed_involvement(self):
        response = self.client.post(
            "/toys/sessions/",
            self._session_payload(
                [
                    {"toy": self.toy_a, "involvement": "USED"},
                    {"toy": self.toy_b, "involvement": "FULLY_INSERTED"},
                ]
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(len(response.data["entries"]), 2)
        kinds = {e["involvement"] for e in response.data["entries"]}
        self.assertEqual(kinds, {"USED", "FULLY_INSERTED"})

    def test_list_orders_by_started_at_descending(self):
        for ts in ("2026-04-01T10:00:00Z", "2026-05-01T10:00:00Z", "2026-04-15T10:00:00Z"):
            self.client.post(
                "/toys/sessions/",
                self._session_payload(
                    [{"toy": self.toy_a, "involvement": "USED"}], started_at=ts
                ),
                format="json",
            )
        response = self.client.get("/toys/sessions/")
        self.assertEqual(response.status_code, 200)
        results = response.data["results"] if "results" in response.data else response.data
        timestamps = [s["started_at"] for s in results]
        self.assertEqual(timestamps, sorted(timestamps, reverse=True))

    def test_empty_entries_rejected(self):
        response = self.client.post(
            "/toys/sessions/", self._session_payload([]), format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("entries", response.data)

    def test_duplicate_toy_rejected(self):
        response = self.client.post(
            "/toys/sessions/",
            self._session_payload(
                [
                    {"toy": self.toy_a, "involvement": "USED"},
                    {"toy": self.toy_a, "involvement": "INSERTED"},
                ]
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_invalid_involvement_rejected(self):
        response = self.client.post(
            "/toys/sessions/",
            self._session_payload([{"toy": self.toy_a, "involvement": "WHATEVER"}]),
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_update_replaces_entries_and_started_at(self):
        create = self.client.post(
            "/toys/sessions/",
            self._session_payload(
                [{"toy": self.toy_a, "involvement": "USED"}],
                started_at="2026-01-01T10:00:00Z",
            ),
            format="json",
        )
        self.assertEqual(create.status_code, 201)
        sid = create.data["id"]

        response = self.client.put(
            f"/toys/sessions/{sid}/",
            self._session_payload(
                [
                    {"toy": self.toy_a, "involvement": "INSERTED"},
                    {"toy": self.toy_b, "involvement": "FULLY_INSERTED"},
                ],
                started_at="2026-02-02T20:00:00Z",
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["started_at"], "2026-02-02T20:00:00Z")
        kinds = {e["involvement"] for e in response.data["entries"]}
        self.assertEqual(kinds, {"INSERTED", "FULLY_INSERTED"})
        self.assertEqual(models.ToySessionEntry.objects.filter(session_id=sid).count(), 2)

    def test_delete_session_succeeds(self):
        create = self.client.post(
            "/toys/sessions/",
            self._session_payload([{"toy": self.toy_a, "involvement": "USED"}]),
            format="json",
        )
        self.assertEqual(create.status_code, 201)
        sid = create.data["id"]
        response = self.client.delete(f"/toys/sessions/{sid}/")
        self.assertEqual(response.status_code, 204)
        self.assertFalse(models.Session.objects.filter(pk=sid).exists())

    def test_toy_deletion_blocked_while_referenced_by_session(self):
        create = self.client.post(
            "/toys/sessions/",
            self._session_payload([{"toy": self.toy_a, "involvement": "INSERTED"}]),
            format="json",
        )
        self.assertEqual(create.status_code, 201)
        sid = create.data["id"]

        # Toy delete blocked.
        response = self.client.delete(f"/toys/toys/{self.toy_a}/")
        self.assertEqual(response.status_code, 409, response.content)
        self.assertIn("detail", response.data)
        self.assertIn("session", response.data["detail"].lower())
        self.assertTrue(models.Toy.objects.filter(pk=self.toy_a).exists())

        # After deleting the session, the toy can be deleted.
        self.client.delete(f"/toys/sessions/{sid}/")
        response = self.client.delete(f"/toys/toys/{self.toy_a}/")
        self.assertEqual(response.status_code, 204)
        self.assertFalse(models.Toy.objects.filter(pk=self.toy_a).exists())


class SessionActivityTests(TestCase):
    def setUp(self):
        from datetime import timedelta

        from django.utils import timezone

        self._timezone = timezone
        self._timedelta = timedelta
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

    def _make_session(self, entries, started_at):
        # Bypass the API so we can stamp arbitrary `started_at` (the API
        # accepts it on create, but using the model directly is cleaner).
        session = models.Session.objects.create(started_at=started_at)
        for e in entries:
            models.ToySessionEntry.objects.create(session=session, toy_id=e["toy"], involvement=e["involvement"])
        return session

    def test_empty_returns_no_days(self):
        response = self.client.get("/toys/sessions/activity/")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data, {"days": []})

    def test_used_only_session_appears_with_null_peaks(self):
        now = self._timezone.now()
        self._make_session([{"toy": self.toy_a, "involvement": "USED"}], now)
        response = self.client.get("/toys/sessions/activity/")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(len(response.data["days"]), 1)
        day = response.data["days"][0]
        self.assertEqual(day["session_count"], 1)
        self.assertIsNone(day["max_insertable_length"])
        self.assertIsNone(day["max_circumference"])

    def test_multiple_sessions_same_day_take_overall_max(self):
        now = self._timezone.now()
        # Both toys default to insertable_length=170 and section
        # circumference=220 (from _payload). Session 1 fully-inserts toy_a
        # (length + circ contribute); session 2 inserts toy_b (only circ
        # contributes). Day length comes from session 1; day circ ties
        # across both.
        self._make_session([{"toy": self.toy_a, "involvement": "FULLY_INSERTED"}], now)
        self._make_session([{"toy": self.toy_b, "involvement": "INSERTED"}], now)
        response = self.client.get("/toys/sessions/activity/")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(len(response.data["days"]), 1)
        day = response.data["days"][0]
        self.assertEqual(day["session_count"], 2)
        self.assertEqual(day["max_insertable_length"], 170)
        self.assertEqual(day["max_circumference"], 220)

    def test_window_excludes_sessions_older_than_a_year(self):
        now = self._timezone.now()
        old = now - self._timedelta(days=400)
        self._make_session([{"toy": self.toy_a, "involvement": "FULLY_INSERTED"}], old)
        response = self.client.get("/toys/sessions/activity/")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["days"], [])

