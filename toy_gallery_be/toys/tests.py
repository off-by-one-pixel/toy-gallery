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
        self.assertIs(export_mod.latest(), export_mod.ExportV1)

    def test_for_version_returns_handler(self):
        self.assertIs(export_mod.for_version(1), export_mod.ExportV1)

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
        self.assertEqual(data["version"], 1)
        self.assertIn("exported_at", data)
        self.assertEqual(len(data["toys"]), 1)
        toy = data["toys"][0]
        # Scalar mm shape (NOT the {mm, in} dict).
        self.assertEqual(toy["brand"], "Acme")
        self.assertEqual(toy["insertable_length"], 170)
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
        self.assertEqual(response.data, {"created": before})
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

    def test_peak_dimensions_only_count_inserted_toys(self):
        # toy_a has insertable_length=170, diameter=70 (per _payload defaults)
        # toy_b same. Make a session where toy_a is "used" (skipped) and
        # toy_b is "fully inserted" → peaks come only from toy_b.
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
        self.assertEqual(response.data["max_diameter"], 70)

    def test_peak_dimensions_are_null_when_no_toys_inserted(self):
        response = self.client.post(
            "/toys/sessions/",
            self._session_payload([{"toy": self.toy_a, "involvement": "USED"}]),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertIsNone(response.data["max_insertable_length"])
        self.assertIsNone(response.data["max_diameter"])

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
