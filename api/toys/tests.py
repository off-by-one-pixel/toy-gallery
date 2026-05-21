import tempfile
from pathlib import Path

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from toy_gallery.urls import _resolve_spa_html

from . import export as export_mod
from . import models


def _payload(
    *,
    section_circumferences=(None, None, None),
    insertable_length=170,
    total_length=210,
    circumference=220.0,
):
    return {
        "brand": "Acme",
        "name": "Demo",
        "size": "M",
        "color": "#c4b5fd",
        "insertable_length": insertable_length,
        "total_length": total_length,
        "circumference": circumference,
        "shape": {
            "top_section_shape": "EGG",
            "sections": [
                {"order": idx, "diameter": 70, "height": 30, "circumference": c}
                for idx, c in enumerate(section_circumferences)
            ],
        },
    }


class ToyCreateTests(TestCase):
    def setUp(self):
        user = User.objects.create_user(username="u", password="p")
        self.client = APIClient()
        self.client.force_authenticate(user=user)

    def test_create_persists_manufacturer_specs(self):
        response = self.client.post(
            "/toys/toys/",
            _payload(insertable_length=170, total_length=210, circumference=220.0),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.data["insertable_length"], 170)
        self.assertEqual(response.data["total_length"], 210)
        self.assertEqual(response.data["circumference"], 220.0)

    def test_create_succeeds_without_any_section_circumference(self):
        response = self.client.post(
            "/toys/toys/",
            _payload(section_circumferences=(None, None, None)),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)

    def test_manufacturer_specs_are_optional(self):
        response = self.client.post(
            "/toys/toys/",
            _payload(insertable_length=None, total_length=None, circumference=None),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertIsNone(response.data["insertable_length"])
        self.assertIsNone(response.data["total_length"])
        self.assertIsNone(response.data["circumference"])

    def test_response_has_scalar_mm_dimensions(self):
        response = self.client.post(
            "/toys/toys/",
            _payload(section_circumferences=(None, 220.0, None)),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        data = response.data
        for field in ("insertable_length", "total_length", "circumference"):
            self.assertIsInstance(data[field], (int, float), field)
        for section in data["shape"]["sections"]:
            for field in ("height", "diameter"):
                self.assertIsInstance(section[field], (int, float), field)
        null_sections = [s for s in data["shape"]["sections"] if s["circumference"] is None]
        self.assertTrue(null_sections)


class CurveAngleTests(TestCase):
    def setUp(self):
        user = User.objects.create_user(username="u", password="p")
        self.client = APIClient()
        self.client.force_authenticate(user=user)

    def test_create_defaults_curve_angles_when_omitted(self):
        response = self.client.post("/toys/toys/", _payload(), format="json")
        self.assertEqual(response.status_code, 201, response.content)
        for section in response.data["shape"]["sections"]:
            self.assertEqual(section["top_curve_angle"], 0)
            self.assertEqual(section["bottom_curve_angle"], 180)

    def test_create_persists_explicit_curve_angles(self):
        payload = _payload()
        payload["shape"]["sections"][0]["top_curve_angle"] = 90
        payload["shape"]["sections"][1]["bottom_curve_angle"] = 45
        response = self.client.post("/toys/toys/", payload, format="json")
        self.assertEqual(response.status_code, 201, response.content)
        sections = response.data["shape"]["sections"]
        self.assertEqual(sections[0]["top_curve_angle"], 90)
        self.assertEqual(sections[0]["bottom_curve_angle"], 180)
        self.assertEqual(sections[1]["top_curve_angle"], 0)
        self.assertEqual(sections[1]["bottom_curve_angle"], 45)

    def test_rejects_curve_angle_outside_choices(self):
        payload = _payload()
        payload["shape"]["sections"][0]["top_curve_angle"] = 30  # not in [0,45,90,135,180]
        response = self.client.post("/toys/toys/", payload, format="json")
        self.assertEqual(response.status_code, 400, response.content)


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


class PatchToyShapeTests(TestCase):
    """PATCH /toys/toys/<id>/ with a nested `shape` updates the toy in place
    instead of forcing the frontend to do POST-then-DELETE. Same toy id,
    same sessions intact, atomic — and it works on toys that are
    referenced by sessions (the old codepath couldn't, because PROTECT
    blocks delete)."""

    def setUp(self):
        user = User.objects.create_user(username="u", password="p")
        self.client = APIClient()
        self.client.force_authenticate(user=user)
        self.toy = self.client.post(
            "/toys/toys/",
            _payload(section_circumferences=(None, 220.0, None)),
            format="json",
        ).data

    def test_patch_replaces_shape_in_place(self):
        new_shape = {
            "top_section_shape": "CONE",
            "sections": [
                {"order": 0, "diameter": 100, "height": 50, "circumference": 314.16},
                {"order": 1, "diameter": 60, "height": 40, "circumference": None},
            ],
        }
        response = self.client.patch(
            f"/toys/toys/{self.toy['id']}/",
            {"shape": new_shape},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["id"], self.toy["id"])
        self.assertEqual(response.data["shape"]["top_section_shape"], "CONE")
        self.assertEqual(len(response.data["shape"]["sections"]), 2)
        self.assertEqual(response.data["shape"]["sections"][0]["circumference"], 314.16)
        self.assertEqual(models.Toy.objects.count(), 1)
        # Sections are wholesale-replaced — no orphans hanging around.
        self.assertEqual(models.ShapeSection.objects.count(), 2)

    def test_patch_without_shape_leaves_sections_untouched(self):
        original_section_ids = sorted(
            s.id for s in models.Toy.objects.get(pk=self.toy["id"]).shape.sections.all()
        )
        response = self.client.patch(
            f"/toys/toys/{self.toy['id']}/",
            {"name": "Renamed"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["name"], "Renamed")
        self.assertEqual(
            sorted(s.id for s in models.Toy.objects.get(pk=self.toy["id"]).shape.sections.all()),
            original_section_ids,
        )

    def test_patch_works_on_toy_referenced_by_session(self):
        # Reproduces the old footgun: editing a toy that's in a session used
        # to fail because the create-then-delete flow couldn't delete the
        # original (PROTECT FK from ToySessionEntry).
        session_response = self.client.post(
            "/toys/sessions/",
            {
                "started_at": "2026-04-01T10:00:00Z",
                "entries": [{"toy": self.toy["id"], "involvement": "FULLY_INSERTED"}],
            },
            format="json",
        )
        self.assertEqual(session_response.status_code, 201, session_response.content)

        new_shape = {
            "top_section_shape": "EGG",
            "sections": [
                {"order": 0, "diameter": 80, "height": 40, "circumference": 251.33},
            ],
        }
        response = self.client.patch(
            f"/toys/toys/{self.toy['id']}/",
            {"shape": new_shape, "name": "Edited"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["id"], self.toy["id"])
        # Session entry still points at the same toy.
        entry = models.ToySessionEntry.objects.get()
        self.assertEqual(entry.toy_id, self.toy["id"])


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
        good = _payload(section_circumferences=(None, 200.0, None))
        bad = _payload()
        bad.pop("brand")
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
            models.ToySessionEntry.objects.create(
                session=session, toy_id=e["toy"], involvement=e["involvement"]
            )
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


class ChangePasswordTests(TestCase):
    URL = "/toys/change_password/"

    def setUp(self):
        self.user = User.objects.create_user(username="u", password="oldpassword42")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_changes_password_with_valid_current(self):
        response = self.client.post(
            self.URL,
            {"current_password": "oldpassword42", "new_password": "BrandNewPwd987"},
            format="json",
        )
        self.assertEqual(response.status_code, 204, response.content)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("BrandNewPwd987"))
        self.assertFalse(self.user.check_password("oldpassword42"))

    def test_rejects_wrong_current_password(self):
        response = self.client.post(
            self.URL,
            {"current_password": "wrong", "new_password": "BrandNewPwd987"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("current_password", response.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("oldpassword42"))

    def test_rejects_new_password_failing_validators(self):
        # Django default validators reject passwords < 8 chars and overly common ones.
        response = self.client.post(
            self.URL,
            {"current_password": "oldpassword42", "new_password": "short"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("new_password", response.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("oldpassword42"))

    def test_requires_authentication(self):
        anon = APIClient()
        response = anon.post(
            self.URL,
            {"current_password": "oldpassword42", "new_password": "BrandNewPwd987"},
            format="json",
        )
        self.assertEqual(response.status_code, 401)

    def test_missing_fields_rejected(self):
        response = self.client.post(self.URL, {}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("current_password", response.data)
        self.assertIn("new_password", response.data)


class SpaIndexResolutionTests(TestCase):
    """The catch-all has to find the right Next.js export file for a given
    URL, otherwise deep-linking to /sessions ships the gallery HTML instead.
    """

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.frontend = Path(self._tmp.name)
        # Mirror the layout `next build` produces with output: 'export'.
        (self.frontend / "index.html").write_text("<root>")
        (self.frontend / "sessions.html").write_text("<sessions>")
        (self.frontend / "login.html").write_text("<login>")
        (self.frontend / "sessions").mkdir()
        (self.frontend / "sessions" / "edit.html").write_text("<edit>")
        (self.frontend / "sessions" / "new.html").write_text("<new>")

    def tearDown(self):
        self._tmp.cleanup()

    def test_root_path_serves_index(self):
        f = _resolve_spa_html("/", self.frontend)
        self.assertEqual(f.read_text(), "<root>")

    def test_top_level_route_serves_named_html(self):
        # The bug: /sessions used to fall back to index.html → users saw
        # the gallery instead of the sessions page after a hard refresh.
        f = _resolve_spa_html("/sessions", self.frontend)
        self.assertEqual(f.read_text(), "<sessions>")

    def test_top_level_route_with_trailing_slash(self):
        f = _resolve_spa_html("/sessions/", self.frontend)
        self.assertEqual(f.read_text(), "<sessions>")

    def test_nested_route_serves_named_html(self):
        f = _resolve_spa_html("/sessions/edit", self.frontend)
        self.assertEqual(f.read_text(), "<edit>")

    def test_unknown_route_falls_back_to_index(self):
        f = _resolve_spa_html("/some-unknown-spa-route", self.frontend)
        self.assertEqual(f.read_text(), "<root>")

    def test_path_traversal_rejected(self):
        # A frontend dir with a sibling file outside it, the SPA must not
        # reach via "..".
        with tempfile.TemporaryDirectory() as outer:
            outer_path = Path(outer)
            secret = outer_path / "secret.html"
            secret.write_text("<secret>")
            inside = outer_path / "frontend"
            inside.mkdir()
            (inside / "index.html").write_text("<root>")
            f = _resolve_spa_html("/../secret", inside)
            # Either falls back to index or returns None — never the secret.
            self.assertIsNotNone(f)
            self.assertNotEqual(f.read_text(), "<secret>")

    def test_returns_none_when_frontend_is_empty(self):
        with tempfile.TemporaryDirectory() as empty:
            self.assertIsNone(_resolve_spa_html("/", Path(empty)))

