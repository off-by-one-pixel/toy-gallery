import datetime
import tempfile
from pathlib import Path

from django.test import TestCase
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient

from toy_gallery.urls import _resolve_spa_html

from . import export as export_mod
from . import models
from .serializers import ToySerializer, ToyShapeSectionSerializer, ToyShapeSerializer
from .testutils import SESSION_START, ApiTestBase, _payload


class ToyCreateTests(ApiTestBase):
    def test_create_persists_manufacturer_specs(self):
        data = self._post_toy()
        self.assertEqual(data["insertable_length"], 170)
        self.assertEqual(data["total_length"], 210)
        self.assertEqual(data["circumference"], 220.0)

    def test_create_succeeds_without_any_section_circumference(self):
        data = self._post_toy(**_payload())
        circumferences = [s["circumference"] for s in data["shape"]["sections"]]
        self.assertEqual(circumferences, [None, None, None])

    def test_manufacturer_specs_are_optional(self):
        data = self._post_toy(insertable_length=None, total_length=None, circumference=None)
        self.assertIsNone(data["insertable_length"])
        self.assertIsNone(data["total_length"])
        self.assertIsNone(data["circumference"])

    def test_response_has_scalar_mm_dimensions(self):
        data = self._post_toy()
        for field in ("insertable_length", "total_length", "circumference"):
            self.assertIsInstance(data[field], (int, float), field)
        for section in data["shape"]["sections"]:
            for field in ("height", "diameter"):
                self.assertIsInstance(section[field], (int, float), field)
        null_sections = [s for s in data["shape"]["sections"] if s["circumference"] is None]
        self.assertTrue(null_sections)


class UsageCountTests(ApiTestBase):
    def test_list_reports_session_entry_count_per_toy(self):
        used_twice = self._create_toy()
        used_once = self._create_toy()
        never_used = self._create_toy()
        self._post_session(
            [{"toy": used_twice, "involvement": "USED"}, {"toy": used_once, "involvement": "USED"}]
        )
        self._post_session([{"toy": used_twice, "involvement": "USED"}])

        response = self.client.get("/toys/toys/")
        self.assertEqual(response.status_code, 200)
        counts = {t["id"]: t["usage_count"] for t in response.data}
        self.assertEqual(counts[used_twice], 2)
        self.assertEqual(counts[used_once], 1)
        self.assertEqual(counts[never_used], 0)

    def test_create_response_includes_usage_count(self):
        data = self._post_toy()
        self.assertEqual(data["usage_count"], 0)
        self.assertEqual(data["total_duration_minutes"], 0)
        self.assertEqual(data["max_duration_minutes"], 0)

    def test_update_response_reports_session_aggregates(self):
        toy_id = self._create_toy()
        for minutes in (30, 65):
            self._post_session(
                [{"toy": toy_id, "involvement": "USED", "duration_minutes": minutes}]
            )
        response = self.client.patch(f"/toys/toys/{toy_id}/", {"name": "Renamed"}, format="json")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["usage_count"], 2)
        self.assertEqual(response.data["total_duration_minutes"], 95)
        self.assertEqual(response.data["max_duration_minutes"], 65)


class CurveAngleTests(ApiTestBase):
    def test_create_defaults_curve_angles_when_omitted(self):
        for section in self._post_toy()["shape"]["sections"]:
            self.assertEqual(section["top_curve_angle"], 0)
            self.assertEqual(section["bottom_curve_angle"], 180)

    def test_create_persists_explicit_curve_angles(self):
        payload = _payload()
        payload["shape"]["sections"][0]["top_curve_angle"] = 90
        payload["shape"]["sections"][1]["bottom_curve_angle"] = 45
        sections = self._post_toy(**payload)["shape"]["sections"]
        self.assertEqual(sections[0]["top_curve_angle"], 90)
        self.assertEqual(sections[0]["bottom_curve_angle"], 180)
        self.assertEqual(sections[1]["top_curve_angle"], 0)
        self.assertEqual(sections[1]["bottom_curve_angle"], 45)

    def test_create_defaults_section_color_to_null(self):
        for section in self._post_toy()["shape"]["sections"]:
            self.assertIsNone(section["color"])

    def test_create_persists_section_colors(self):
        payload = _payload()
        payload["shape"]["sections"][1]["color"] = "#ff8800"
        sections = self._post_toy(**payload)["shape"]["sections"]
        self.assertIsNone(sections[0]["color"])
        self.assertEqual(sections[1]["color"], "#ff8800")

    def test_update_clears_section_color(self):
        payload = _payload()
        payload["shape"]["sections"][0]["color"] = "#ff8800"
        created = self._post_toy(**payload)
        payload["shape"]["sections"][0]["color"] = None
        response = self.client.put(f"/toys/toys/{created['id']}/", payload, format="json")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertIsNone(response.data["shape"]["sections"][0]["color"])

    def test_rejects_curve_angle_outside_choices(self):
        payload = _payload()
        payload["shape"]["sections"][0]["top_curve_angle"] = 30
        response = self.client.post("/toys/toys/", payload, format="json")
        self.assertEqual(response.status_code, 400, response.content)


class CustomAttributesTests(ApiTestBase):
    def _suggestions(self):
        response = self.client.get("/toys/toys/attribute-suggestions/")
        self.assertEqual(response.status_code, 200, response.content)
        return response.data

    def test_suggestions_empty_without_attributes(self):
        self._post_toy()
        self.assertEqual(self._suggestions(), [])

    def test_suggestions_collect_keys_sorted_with_per_key_values(self):
        self._post_toy(custom_attributes={"Material": "Silicone", "Firmness": "Soft"})
        self._post_toy(custom_attributes={"Base": "Suction", "Material": "Glass"})
        self.assertEqual(
            self._suggestions(),
            [
                {"key": "Base", "values": ["Suction"]},
                {"key": "Firmness", "values": ["Soft"]},
                {"key": "Material", "values": ["Glass", "Silicone"]},
            ],
        )

    def test_suggestions_merge_keys_case_insensitively_and_skip_blanks(self):
        self._post_toy(custom_attributes={"Material": "Silicone", "  ": "ignored"})
        self._post_toy(custom_attributes={"material": "silicone", "Base": "  "})
        self.assertEqual(
            self._suggestions(),
            [
                {"key": "Base", "values": []},
                {"key": "Material", "values": ["Silicone", "silicone"]},
            ],
        )

    def test_create_round_trips_custom_attributes(self):
        data = self._post_toy(custom_attributes={"firmness": "medium", "price": "99.00"})
        self.assertEqual(data["custom_attributes"], {"firmness": "medium", "price": "99.00"})

    def test_default_is_empty_dict(self):
        self.assertEqual(self._post_toy()["custom_attributes"], {})

    def test_patch_replaces_custom_attributes_without_touching_other_fields(self):
        created = self._post_toy(custom_attributes={"firmness": "medium"})
        response = self.client.patch(
            f"/toys/toys/{created['id']}/",
            {"custom_attributes": {"material": "silicone"}},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["custom_attributes"], {"material": "silicone"})
        self.assertEqual(response.data["brand"], created["brand"])
        self.assertEqual(response.data["name"], created["name"])

    def test_nested_structure_values_are_rejected(self):
        payload = _payload(custom_attributes={"tags": ["a", "b"]})
        response = self.client.post("/toys/toys/", payload, format="json")
        self.assertEqual(response.status_code, 400, response.content)
        self.assertIn("custom_attributes", response.data)

    def test_empty_keys_are_stripped_and_keys_are_trimmed(self):
        data = self._post_toy(
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
        created = self._post_toy(custom_attributes={"firmness": "medium"})
        response = self.client.patch(
            f"/toys/toys/{created['id']}/",
            {"custom_attributes": {"firmness": ""}},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["custom_attributes"], {"firmness": ""})


class PatchToyShapeTests(ApiTestBase):
    def setUp(self):
        super().setUp()
        self.toy = self._post_toy()

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
        self._post_session([{"toy": self.toy["id"], "involvement": "FULLY_INSERTED"}])

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
        with self.assertRaises(ValidationError):
            export_mod.for_version(99)

    def test_for_version_rejects_non_int(self):
        with self.assertRaises(ValidationError):
            export_mod.for_version("1")


class ExportImportTests(ApiTestBase):
    def setUp(self):
        super().setUp()
        self._create_toy()

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
        self._post_toy(custom_attributes={"firmness": "medium", "material": "silicone"})

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
        styled = _payload(name="Styled", date_purchased="2025-03-14", retired=True)
        styled["shape"]["sections"][1].update(
            color="#ff0000", top_curve_angle=45, bottom_curve_angle=135
        )
        self._post_toy(**styled)

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
        good = _payload((None, 200.0, None))
        bad = _payload()
        bad.pop("brand")
        envelope = {"version": 1, "exported_at": "x", "toys": [good, bad]}
        before = models.Toy.objects.count()
        response = self.client.post("/toys/toys/import/", envelope, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(models.Toy.objects.count(), before)


class ExportV2SessionsTests(ApiTestBase):
    def setUp(self):
        super().setUp()
        self.toy_a = self._create_toy("A")
        self.toy_b = self._create_toy("B")

    def test_round_trip_includes_sessions_with_durations_and_end_time(self):
        self._post_session(
            [
                {"toy": self.toy_a, "involvement": "FULLY_INSERTED", "duration_minutes": 45},
                {"toy": self.toy_b, "involvement": "USED"},
            ],
            ended_at="2026-06-01T11:00:00Z",
        )
        exported = self.client.get("/toys/toys/export/").data
        self.assertEqual(exported["version"], 3)
        self.assertEqual(len(exported["sessions"]), 1)
        local_ids = {t["_id"] for t in exported["toys"]}
        self.assertEqual(local_ids, {0, 1})
        exported_session = exported["sessions"][0]
        self.assertIn("2026-06-01T11:00:00", exported_session["ended_at"])
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
            "toys": [_payload((None, 200.0, None), _id=0)],
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
            "toys": [_payload((None, 200.0, None), _id=0)],
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
            "toys": [_payload((None, 200.0, None))],
        }
        response = self.client.post("/toys/toys/import/", envelope, format="json")
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.data, {"toys_created": 1, "sessions_created": 0})


class DeleteCollectionTests(ApiTestBase):
    def test_wipes_toys_and_sessions(self):
        toy_a = self._create_toy("A")
        toy_b = self._create_toy("B")
        self._post_session(
            [
                {"toy": toy_a, "involvement": "FULLY_INSERTED"},
                {"toy": toy_b, "involvement": "USED"},
            ]
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


class LiveSessionTests(ApiTestBase):
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
        started = self.client.post("/toys/sessions/start/").data
        update = self._put_session(
            started["id"],
            [{"toy": toy, "involvement": "USED"}],
            started["started_at"],
            ended_at="2999-01-01T00:00:00Z",
        )
        self.assertFalse(update["is_live"])
        self.assertIsNone(self.client.get("/toys/sessions/live/").data["session"])

    def test_saving_without_end_time_keeps_session_live(self):
        toy = self._create_toy()
        started = self.client.post("/toys/sessions/start/").data
        update = self._put_session(
            started["id"],
            [{"toy": toy, "involvement": "USED"}],
            started["started_at"],
            ended_at=None,
        )
        self.assertTrue(update["is_live"])

    def test_clearing_end_time_does_not_resurrect_liveness(self):
        toy = self._create_toy()
        session = models.Session.objects.create(
            started_at=SESSION_START, ended_at="2026-06-01T11:00:00Z"
        )
        update = self._put_session(session.pk, [{"toy": toy, "involvement": "USED"}], ended_at=None)
        self.assertFalse(update["is_live"])

    def test_is_live_cannot_be_set_through_the_write_api(self):
        toy = self._create_toy()
        data = self._post_session([{"toy": toy, "involvement": "USED"}], is_live=True)
        self.assertFalse(data["is_live"])


class SessionTests(ApiTestBase):
    def setUp(self):
        super().setUp()
        self.toy_a = self._create_toy("A")
        self.toy_b = self._create_toy("B")

    def test_used_contributes_neither_length_nor_circumference(self):
        data = self._post_session([{"toy": self.toy_a, "involvement": "USED"}])
        self.assertIsNone(data["max_insertable_length"])
        self.assertIsNone(data["max_circumference"])

    def test_inserted_contributes_circumference_but_not_length(self):
        data = self._post_session([{"toy": self.toy_a, "involvement": "INSERTED"}])
        self.assertIsNone(data["max_insertable_length"])
        self.assertEqual(data["max_circumference"], 220)

    def test_fully_inserted_contributes_both(self):
        data = self._post_session([{"toy": self.toy_a, "involvement": "FULLY_INSERTED"}])
        self.assertEqual(data["max_insertable_length"], 170)
        self.assertEqual(data["max_circumference"], 220)

    def test_peak_length_only_from_fully_inserted_when_mixed(self):
        data = self._post_session(
            [
                {"toy": self.toy_a, "involvement": "INSERTED"},
                {"toy": self.toy_b, "involvement": "FULLY_INSERTED"},
            ]
        )
        self.assertEqual(data["max_insertable_length"], 170)
        self.assertEqual(data["max_circumference"], 220)

    def test_used_and_fully_inserted_drops_used(self):
        data = self._post_session(
            [
                {"toy": self.toy_a, "involvement": "USED"},
                {"toy": self.toy_b, "involvement": "FULLY_INSERTED"},
            ]
        )
        self.assertEqual(data["max_insertable_length"], 170)
        self.assertEqual(data["max_circumference"], 220)

    def test_create_with_mixed_involvement(self):
        data = self._post_session(
            [
                {"toy": self.toy_a, "involvement": "USED"},
                {"toy": self.toy_b, "involvement": "FULLY_INSERTED"},
            ]
        )
        self.assertEqual(len(data["entries"]), 2)
        kinds = {e["involvement"] for e in data["entries"]}
        self.assertEqual(kinds, {"USED", "FULLY_INSERTED"})

    def test_entry_duration_round_trips_and_defaults_to_null(self):
        data = self._post_session(
            [
                {"toy": self.toy_a, "involvement": "USED", "duration_minutes": 95},
                {"toy": self.toy_b, "involvement": "INSERTED"},
            ]
        )
        by_toy = {e["toy"]: e["duration_minutes"] for e in data["entries"]}
        self.assertEqual(by_toy[self.toy_a], 95)
        self.assertIsNone(by_toy[self.toy_b])

        update = self._put_session(
            data["id"], [{"toy": self.toy_a, "involvement": "USED", "duration_minutes": 30}]
        )
        self.assertEqual(update["entries"][0]["duration_minutes"], 30)

    def test_ended_at_round_trips_and_defaults_to_null(self):
        entries = [{"toy": self.toy_a, "involvement": "USED"}]
        data = self._post_session(entries)
        self.assertIsNone(data["ended_at"])

        update = self._put_session(data["id"], entries, ended_at="2026-06-02T07:30:00Z")
        self.assertEqual(update["ended_at"], "2026-06-02T07:30:00Z")

    def test_ended_at_before_start_rejected(self):
        data = self._post_session(
            [{"toy": self.toy_a, "involvement": "USED"}],
            status=400,
            ended_at="2026-06-01T09:00:00Z",
        )
        self.assertIn("ended_at", data)

    def test_negative_duration_rejected(self):
        self._post_session(
            [{"toy": self.toy_a, "involvement": "USED", "duration_minutes": -5}], status=400
        )

    def test_toy_total_duration_aggregates_across_sessions(self):
        for minutes in (30, None, 65):
            self._post_session(
                [{"toy": self.toy_a, "involvement": "USED", "duration_minutes": minutes}]
            )

        toys = {t["id"]: t for t in self.client.get("/toys/toys/").data}
        self.assertEqual(toys[self.toy_a]["total_duration_minutes"], 95)
        self.assertEqual(toys[self.toy_b]["total_duration_minutes"], 0)

    def test_toy_max_duration_reports_the_longest_single_session(self):
        for minutes in (30, None, 65):
            self._post_session(
                [{"toy": self.toy_a, "involvement": "USED", "duration_minutes": minutes}]
            )

        toys = {t["id"]: t for t in self.client.get("/toys/toys/").data}
        self.assertEqual(toys[self.toy_a]["max_duration_minutes"], 65)
        self.assertEqual(toys[self.toy_b]["max_duration_minutes"], 0)

    def test_toy_detail_reports_max_duration(self):
        self._post_session([{"toy": self.toy_a, "involvement": "USED", "duration_minutes": 42}])
        response = self.client.get(f"/toys/toys/{self.toy_a}/")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["max_duration_minutes"], 42)

    def test_list_orders_by_started_at_descending(self):
        for ts in ("2026-04-01T10:00:00Z", "2026-05-01T10:00:00Z", "2026-04-15T10:00:00Z"):
            self._post_session([{"toy": self.toy_a, "involvement": "USED"}], ts)
        response = self.client.get("/toys/sessions/")
        self.assertEqual(response.status_code, 200)
        timestamps = [s["started_at"] for s in response.data["results"]]
        self.assertEqual(timestamps, sorted(timestamps, reverse=True))

    def test_empty_entries_rejected(self):
        self.assertIn("entries", self._post_session([], status=400))

    def test_duplicate_toy_rejected(self):
        self._post_session(
            [
                {"toy": self.toy_a, "involvement": "USED"},
                {"toy": self.toy_a, "involvement": "INSERTED"},
            ],
            status=400,
        )

    def test_invalid_involvement_rejected(self):
        self._post_session([{"toy": self.toy_a, "involvement": "WHATEVER"}], status=400)

    def test_update_replaces_entries_and_started_at(self):
        sid = self._post_session(
            [{"toy": self.toy_a, "involvement": "USED"}], "2026-01-01T10:00:00Z"
        )["id"]

        data = self._put_session(
            sid,
            [
                {"toy": self.toy_a, "involvement": "INSERTED"},
                {"toy": self.toy_b, "involvement": "FULLY_INSERTED"},
            ],
            "2026-02-02T20:00:00Z",
        )
        self.assertEqual(data["started_at"], "2026-02-02T20:00:00Z")
        kinds = {e["involvement"] for e in data["entries"]}
        self.assertEqual(kinds, {"INSERTED", "FULLY_INSERTED"})
        self.assertEqual(models.ToySessionEntry.objects.filter(session_id=sid).count(), 2)

    def test_delete_session_succeeds(self):
        sid = self._post_session([{"toy": self.toy_a, "involvement": "USED"}])["id"]
        response = self.client.delete(f"/toys/sessions/{sid}/")
        self.assertEqual(response.status_code, 204)
        self.assertFalse(models.Session.objects.filter(pk=sid).exists())

    def test_toy_deletion_blocked_while_referenced_by_session(self):
        sid = self._post_session([{"toy": self.toy_a, "involvement": "INSERTED"}])["id"]

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


class ChangePasswordTests(ApiTestBase):
    URL = "/toys/change_password/"
    password = "oldpassword42"

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
