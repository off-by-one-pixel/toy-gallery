import datetime
import tempfile
from pathlib import Path

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from toy_gallery.urls import _resolve_spa_html

from . import export as export_mod
from . import models
from .serializers import ToySerializer, ToyShapeSectionSerializer, ToyShapeSerializer


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


class UsageCountTests(TestCase):
    def setUp(self):
        user = User.objects.create_user(username="u", password="p")
        self.client = APIClient()
        self.client.force_authenticate(user=user)

    def _create_toy(self):
        response = self.client.post("/toys/toys/", _payload(), format="json")
        self.assertEqual(response.status_code, 201, response.content)
        return response.data["id"]

    def _create_session(self, toy_ids, started_at):
        response = self.client.post(
            "/toys/sessions/",
            {
                "started_at": started_at,
                "entries": [{"toy": tid, "involvement": "USED"} for tid in toy_ids],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)

    def test_list_reports_session_entry_count_per_toy(self):
        used_twice = self._create_toy()
        used_once = self._create_toy()
        never_used = self._create_toy()
        self._create_session([used_twice, used_once], "2026-04-01T10:00:00Z")
        self._create_session([used_twice], "2026-04-02T10:00:00Z")

        response = self.client.get("/toys/toys/")
        self.assertEqual(response.status_code, 200)
        counts = {t["id"]: t["usage_count"] for t in response.data}
        self.assertEqual(counts[used_twice], 2)
        self.assertEqual(counts[used_once], 1)
        self.assertEqual(counts[never_used], 0)

    def test_create_response_includes_usage_count(self):
        response = self.client.post("/toys/toys/", _payload(), format="json")
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.data["usage_count"], 0)
        self.assertEqual(response.data["total_duration_minutes"], 0)
        self.assertEqual(response.data["max_duration_minutes"], 0)

    def test_update_response_reports_session_aggregates(self):
        toy_id = self._create_toy()
        for minutes in (30, 65):
            self.client.post(
                "/toys/sessions/",
                {
                    "started_at": "2026-04-01T10:00:00Z",
                    "entries": [
                        {"toy": toy_id, "involvement": "USED", "duration_minutes": minutes}
                    ],
                },
                format="json",
            )
        response = self.client.patch(f"/toys/toys/{toy_id}/", {"name": "Renamed"}, format="json")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["usage_count"], 2)
        self.assertEqual(response.data["total_duration_minutes"], 95)
        self.assertEqual(response.data["max_duration_minutes"], 65)


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

    def test_create_defaults_section_color_to_null(self):
        response = self.client.post("/toys/toys/", _payload(), format="json")
        self.assertEqual(response.status_code, 201, response.content)
        for section in response.data["shape"]["sections"]:
            self.assertIsNone(section["color"])

    def test_create_persists_section_colors(self):
        payload = _payload()
        payload["shape"]["sections"][1]["color"] = "#ff8800"
        response = self.client.post("/toys/toys/", payload, format="json")
        self.assertEqual(response.status_code, 201, response.content)
        sections = response.data["shape"]["sections"]
        self.assertIsNone(sections[0]["color"])
        self.assertEqual(sections[1]["color"], "#ff8800")

    def test_update_clears_section_color(self):
        payload = _payload()
        payload["shape"]["sections"][0]["color"] = "#ff8800"
        created = self.client.post("/toys/toys/", payload, format="json")
        self.assertEqual(created.status_code, 201, created.content)
        payload["shape"]["sections"][0]["color"] = None
        response = self.client.put(f"/toys/toys/{created.data['id']}/", payload, format="json")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertIsNone(response.data["shape"]["sections"][0]["color"])

    def test_rejects_curve_angle_outside_choices(self):
        payload = _payload()
        payload["shape"]["sections"][0]["top_curve_angle"] = 30
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

    def _suggestions(self):
        response = self.client.get("/toys/toys/attribute-suggestions/")
        self.assertEqual(response.status_code, 200, response.content)
        return response.data

    def test_suggestions_empty_without_attributes(self):
        self._create_toy()
        self.assertEqual(self._suggestions(), [])

    def test_suggestions_collect_keys_sorted_with_per_key_values(self):
        self._create_toy(custom_attributes={"Material": "Silicone", "Firmness": "Soft"})
        self._create_toy(custom_attributes={"Base": "Suction", "Material": "Glass"})
        self.assertEqual(
            self._suggestions(),
            [
                {"key": "Base", "values": ["Suction"]},
                {"key": "Firmness", "values": ["Soft"]},
                {"key": "Material", "values": ["Glass", "Silicone"]},
            ],
        )

    def test_suggestions_merge_keys_case_insensitively_and_skip_blanks(self):
        self._create_toy(custom_attributes={"Material": "Silicone", "  ": "ignored"})
        self._create_toy(custom_attributes={"material": "silicone", "Base": "  "})
        self.assertEqual(
            self._suggestions(),
            [
                {"key": "Base", "values": []},
                {"key": "Material", "values": ["Silicone", "silicone"]},
            ],
        )

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
        entry = models.ToySessionEntry.objects.get()
        self.assertEqual(entry.toy_id, self.toy["id"])


class ExportRegistryTests(TestCase):
    def test_latest_returns_highest_version(self):
        self.assertIs(export_mod.latest(), export_mod.ExportV3)

    def test_for_version_returns_handler(self):
        self.assertIs(export_mod.for_version(1), export_mod.ExportV1)
        self.assertIs(export_mod.for_version(2), export_mod.ExportV2)
        self.assertIs(export_mod.for_version(3), export_mod.ExportV3)

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
        self.client.post(
            "/toys/toys/",
            _payload(section_circumferences=(None, 220.0, None)),
            format="json",
        )

    def test_export_has_envelope_and_portable_toy_shape(self):
        response = self.client.get("/toys/toys/export/")
        self.assertEqual(response.status_code, 200, response.content)
        data = response.data
        self.assertEqual(data["version"], 3)
        self.assertIn("exported_at", data)
        self.assertIn("sessions", data)
        self.assertEqual(len(data["toys"]), 1)
        toy = data["toys"][0]
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
        self.assertEqual(attrs_by_name["Demo"], {"firmness": "medium", "material": "silicone"})

        models.Toy.objects.all().delete()
        response = self.client.post("/toys/toys/import/", exported, format="json")
        self.assertEqual(response.status_code, 201, response.content)
        roundtripped = list(models.Toy.objects.filter(custom_attributes__has_key="firmness"))
        self.assertEqual(len(roundtripped), 1)
        self.assertEqual(
            roundtripped[0].custom_attributes,
            {"firmness": "medium", "material": "silicone"},
        )

    def test_export_round_trips_purchase_retirement_and_section_styling(self):
        styled = _payload()
        styled.update(name="Styled", date_purchased="2025-03-14", retired=True)
        styled["shape"]["sections"][1].update(
            color="#ff0000", top_curve_angle=45, bottom_curve_angle=135
        )
        self.client.post("/toys/toys/", styled, format="json")

        exported = self.client.get("/toys/toys/export/").data
        models.Toy.objects.all().delete()
        response = self.client.post("/toys/toys/import/", exported, format="json")
        self.assertEqual(response.status_code, 201, response.content)

        toy = models.Toy.objects.get(name="Styled")
        self.assertEqual(toy.date_purchased, datetime.date(2025, 3, 14))
        self.assertTrue(toy.retired)
        section = toy.shape.sections.get(order=1)
        self.assertEqual(section.color, "#ff0000")
        self.assertEqual(section.top_curve_angle, 45)
        self.assertEqual(section.bottom_curve_angle, 135)

    def test_export_includes_every_writable_toy_field(self):
        def writable(serializer):
            return {name for name, field in serializer.fields.items() if not field.read_only}

        toy = self.client.get("/toys/toys/export/").data["toys"][0]
        self.assertEqual(set(toy) - {"_id"}, writable(ToySerializer()))
        self.assertEqual(set(toy["shape"]), writable(ToyShapeSerializer()))
        self.assertEqual(set(toy["shape"]["sections"][0]), writable(ToyShapeSectionSerializer()))

    def test_export_download_headers(self):
        response = self.client.get("/toys/toys/export/")
        disposition = response["Content-Disposition"]
        self.assertIn("attachment", disposition)
        self.assertIn("toy-gallery-", disposition)
        self.assertIn(".json", disposition)

    def test_import_is_additive(self):
        exported = self.client.get("/toys/toys/export/").data
        before = models.Toy.objects.count()
        response = self.client.post("/toys/toys/import/", exported, format="json")
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

    def test_round_trip_includes_sessions_with_durations_and_end_time(self):
        self._create_session(
            [
                {"toy": self.toy_a, "involvement": "FULLY_INSERTED", "duration_minutes": 45},
                {"toy": self.toy_b, "involvement": "USED"},
            ],
            started_at="2026-04-01T10:00:00Z",
        )
        session_id = models.Session.objects.get().id
        self.client.patch(
            f"/toys/sessions/{session_id}/", {"ended_at": "2026-04-01T11:00:00Z"}, format="json"
        )
        exported = self.client.get("/toys/toys/export/").data
        self.assertEqual(exported["version"], 3)
        self.assertEqual(len(exported["sessions"]), 1)
        local_ids = {t["_id"] for t in exported["toys"]}
        self.assertEqual(local_ids, {0, 1})
        exported_session = exported["sessions"][0]
        self.assertIn("2026-04-01T11:00:00", exported_session["ended_at"])
        durations = {e["duration_minutes"] for e in exported_session["entries"]}
        self.assertEqual(durations, {45, None})
        for entry in exported_session["entries"]:
            self.assertIn(entry["toy_id"], local_ids)

        models.Session.objects.all().delete()
        models.Toy.objects.all().delete()

        response = self.client.post("/toys/toys/import/", exported, format="json")
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.data, {"toys_created": 2, "sessions_created": 1})
        self.assertEqual(models.Toy.objects.count(), 2)
        self.assertEqual(models.Session.objects.count(), 1)
        session = models.Session.objects.get()
        self.assertIsNotNone(session.ended_at)
        involvements = {e.involvement for e in session.entries.all()}
        self.assertEqual(involvements, {"FULLY_INSERTED", "USED"})
        toy_names = {e.toy.name for e in session.entries.all()}
        self.assertEqual(toy_names, {"A", "B"})
        self.assertEqual({e.duration_minutes for e in session.entries.all()}, {45, None})

    def test_v2_envelope_still_imports(self):
        envelope = {
            "version": 2,
            "exported_at": "x",
            "toys": [
                {**_payload(section_circumferences=(None, 200.0, None)), "_id": 0},
            ],
            "sessions": [
                {
                    "started_at": "2026-04-01T10:00:00Z",
                    "entries": [{"toy_id": 0, "involvement": "USED"}],
                }
            ],
        }
        response = self.client.post("/toys/toys/import/", envelope, format="json")
        self.assertEqual(response.status_code, 201, response.content)
        session = models.Session.objects.latest("id")
        self.assertIsNone(session.ended_at)
        self.assertEqual([e.duration_minutes for e in session.entries.all()], [None])

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
        self.assertEqual(response.data, {"toys_created": 1, "sessions_created": 0})


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


class LiveSessionTests(TestCase):
    def setUp(self):
        user = User.objects.create_user(username="u", password="p")
        self.client = APIClient()
        self.client.force_authenticate(user=user)

    def _create_toy(self):
        payload = _payload(section_circumferences=(None, 220.0, None))
        payload["name"] = "L"
        response = self.client.post("/toys/toys/", payload, format="json")
        self.assertEqual(response.status_code, 201, response.content)
        return response.data["id"]

    def test_start_creates_empty_live_session_stamped_now(self):
        before = timezone.now()
        response = self.client.post("/toys/sessions/start/")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(response.data["is_live"])
        self.assertEqual(response.data["entries"], [])
        self.assertIsNone(response.data["ended_at"])
        started = models.Session.objects.get(pk=response.data["id"]).started_at
        self.assertGreaterEqual(started, before)
        self.assertLessEqual(started, timezone.now())

    def test_start_is_idempotent_while_live(self):
        first = self.client.post("/toys/sessions/start/")
        second = self.client.post("/toys/sessions/start/")
        self.assertEqual(first.data["id"], second.data["id"])
        self.assertEqual(models.Session.objects.filter(is_live=True).count(), 1)

    def test_live_endpoint_returns_null_then_session(self):
        empty = self.client.get("/toys/sessions/live/")
        self.assertEqual(empty.status_code, 200)
        self.assertIsNone(empty.data["session"])

        started = self.client.post("/toys/sessions/start/")
        response = self.client.get("/toys/sessions/live/")
        self.assertEqual(response.data["session"]["id"], started.data["id"])
        self.assertTrue(response.data["session"]["is_live"])

    def test_saving_an_end_time_ends_the_live_session(self):
        toy = self._create_toy()
        started = self.client.post("/toys/sessions/start/")
        payload = {
            "started_at": started.data["started_at"],
            "ended_at": "2999-01-01T00:00:00Z",
            "entries": [{"toy": toy, "involvement": "USED"}],
        }
        update = self.client.put(f"/toys/sessions/{started.data['id']}/", payload, format="json")
        self.assertEqual(update.status_code, 200, update.content)
        self.assertFalse(update.data["is_live"])
        self.assertIsNone(self.client.get("/toys/sessions/live/").data["session"])

    def test_saving_without_end_time_keeps_session_live(self):
        toy = self._create_toy()
        started = self.client.post("/toys/sessions/start/")
        payload = {
            "started_at": started.data["started_at"],
            "ended_at": None,
            "entries": [{"toy": toy, "involvement": "USED"}],
        }
        update = self.client.put(f"/toys/sessions/{started.data['id']}/", payload, format="json")
        self.assertEqual(update.status_code, 200, update.content)
        self.assertTrue(update.data["is_live"])

    def test_clearing_end_time_does_not_resurrect_liveness(self):
        toy = self._create_toy()
        session = models.Session.objects.create(
            started_at="2026-05-02T21:14:00Z", ended_at="2026-05-02T22:00:00Z"
        )
        payload = {
            "started_at": "2026-05-02T21:14:00Z",
            "ended_at": None,
            "entries": [{"toy": toy, "involvement": "USED"}],
        }
        update = self.client.put(f"/toys/sessions/{session.pk}/", payload, format="json")
        self.assertEqual(update.status_code, 200, update.content)
        self.assertFalse(update.data["is_live"])

    def test_is_live_cannot_be_set_through_the_write_api(self):
        toy = self._create_toy()
        response = self.client.post(
            "/toys/sessions/",
            {
                "started_at": "2026-05-02T21:14:00Z",
                "is_live": True,
                "entries": [{"toy": toy, "involvement": "USED"}],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertFalse(response.data["is_live"])


class SessionTests(TestCase):
    def setUp(self):
        user = User.objects.create_user(username="u", password="p")
        self.client = APIClient()
        self.client.force_authenticate(user=user)
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
            self._session_payload([{"toy": self.toy_a, "involvement": "FULLY_INSERTED"}]),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.data["max_insertable_length"], 170)
        self.assertEqual(response.data["max_circumference"], 220)

    def test_peak_length_only_from_fully_inserted_when_mixed(self):
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

    def test_entry_duration_round_trips_and_defaults_to_null(self):
        response = self.client.post(
            "/toys/sessions/",
            self._session_payload(
                [
                    {"toy": self.toy_a, "involvement": "USED", "duration_minutes": 95},
                    {"toy": self.toy_b, "involvement": "INSERTED"},
                ]
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        by_toy = {e["toy"]: e["duration_minutes"] for e in response.data["entries"]}
        self.assertEqual(by_toy[self.toy_a], 95)
        self.assertIsNone(by_toy[self.toy_b])

        session_id = response.data["id"]
        update = self.client.put(
            f"/toys/sessions/{session_id}/",
            self._session_payload(
                [{"toy": self.toy_a, "involvement": "USED", "duration_minutes": 30}]
            ),
            format="json",
        )
        self.assertEqual(update.status_code, 200, update.content)
        self.assertEqual(update.data["entries"][0]["duration_minutes"], 30)

    def test_ended_at_round_trips_and_defaults_to_null(self):
        payload = self._session_payload([{"toy": self.toy_a, "involvement": "USED"}])
        response = self.client.post("/toys/sessions/", payload, format="json")
        self.assertEqual(response.status_code, 201, response.content)
        self.assertIsNone(response.data["ended_at"])

        payload["ended_at"] = "2026-05-03T07:30:00Z"
        update = self.client.put(f"/toys/sessions/{response.data['id']}/", payload, format="json")
        self.assertEqual(update.status_code, 200, update.content)
        self.assertEqual(update.data["ended_at"], "2026-05-03T07:30:00Z")

    def test_ended_at_before_start_rejected(self):
        payload = self._session_payload(
            [{"toy": self.toy_a, "involvement": "USED"}],
            started_at="2026-05-02T21:14:00Z",
        )
        payload["ended_at"] = "2026-05-02T20:00:00Z"
        response = self.client.post("/toys/sessions/", payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("ended_at", response.data)

    def test_negative_duration_rejected(self):
        response = self.client.post(
            "/toys/sessions/",
            self._session_payload(
                [{"toy": self.toy_a, "involvement": "USED", "duration_minutes": -5}]
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_toy_total_duration_aggregates_across_sessions(self):
        for minutes in (30, None, 65):
            entry = {"toy": self.toy_a, "involvement": "USED"}
            if minutes is not None:
                entry["duration_minutes"] = minutes
            response = self.client.post(
                "/toys/sessions/",
                {"started_at": "2026-05-02T21:14:00Z", "entries": [entry]},
                format="json",
            )
            self.assertEqual(response.status_code, 201, response.content)

        toys = {t["id"]: t for t in self.client.get("/toys/toys/").data}
        self.assertEqual(toys[self.toy_a]["total_duration_minutes"], 95)
        self.assertEqual(toys[self.toy_b]["total_duration_minutes"], 0)

    def test_toy_max_duration_reports_the_longest_single_session(self):
        for minutes in (30, None, 65):
            entry = {"toy": self.toy_a, "involvement": "USED"}
            if minutes is not None:
                entry["duration_minutes"] = minutes
            response = self.client.post(
                "/toys/sessions/",
                {"started_at": "2026-05-02T21:14:00Z", "entries": [entry]},
                format="json",
            )
            self.assertEqual(response.status_code, 201, response.content)

        toys = {t["id"]: t for t in self.client.get("/toys/toys/").data}
        self.assertEqual(toys[self.toy_a]["max_duration_minutes"], 65)
        self.assertEqual(toys[self.toy_b]["max_duration_minutes"], 0)

    def test_toy_detail_reports_max_duration(self):
        self.client.post(
            "/toys/sessions/",
            {
                "started_at": "2026-05-02T21:14:00Z",
                "entries": [{"toy": self.toy_a, "involvement": "USED", "duration_minutes": 42}],
            },
            format="json",
        )
        response = self.client.get(f"/toys/toys/{self.toy_a}/")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["max_duration_minutes"], 42)

    def test_list_orders_by_started_at_descending(self):
        for ts in ("2026-04-01T10:00:00Z", "2026-05-01T10:00:00Z", "2026-04-15T10:00:00Z"):
            self.client.post(
                "/toys/sessions/",
                self._session_payload([{"toy": self.toy_a, "involvement": "USED"}], started_at=ts),
                format="json",
            )
        response = self.client.get("/toys/sessions/")
        self.assertEqual(response.status_code, 200)
        results = response.data["results"] if "results" in response.data else response.data
        timestamps = [s["started_at"] for s in results]
        self.assertEqual(timestamps, sorted(timestamps, reverse=True))

    def test_empty_entries_rejected(self):
        response = self.client.post("/toys/sessions/", self._session_payload([]), format="json")
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

        response = self.client.delete(f"/toys/toys/{self.toy_a}/")
        self.assertEqual(response.status_code, 409, response.content)
        self.assertIn("detail", response.data)
        self.assertIn("session", response.data["detail"].lower())
        self.assertTrue(models.Toy.objects.filter(pk=self.toy_a).exists())

        self.client.delete(f"/toys/sessions/{sid}/")
        response = self.client.delete(f"/toys/toys/{self.toy_a}/")
        self.assertEqual(response.status_code, 204)
        self.assertFalse(models.Toy.objects.filter(pk=self.toy_a).exists())
        self.assertEqual(models.Shape.objects.count(), 1)
        self.assertTrue(models.Shape.objects.filter(toy=self.toy_b).exists())


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
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.frontend = Path(self._tmp.name)
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
        with tempfile.TemporaryDirectory() as outer:
            outer_path = Path(outer)
            secret = outer_path / "secret.html"
            secret.write_text("<secret>")
            inside = outer_path / "frontend"
            inside.mkdir()
            (inside / "index.html").write_text("<root>")
            f = _resolve_spa_html("/../secret", inside)
            self.assertIsNotNone(f)
            self.assertNotEqual(f.read_text(), "<secret>")

    def test_returns_none_when_frontend_is_empty(self):
        with tempfile.TemporaryDirectory() as empty:
            self.assertIsNone(_resolve_spa_html("/", Path(empty)))
