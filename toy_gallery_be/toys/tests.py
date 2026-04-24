from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from . import export as export_mod
from . import models
from .dimensions import Dimensions


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
        self.assertEqual(Dimensions.shape_circumference(self.shape), 300)

    def test_circumference_ignores_nulls(self):
        models.ShapeSection.objects.create(
            shape=self.shape, order=0, diameter=50, height=30, circumference=None
        )
        models.ShapeSection.objects.create(
            shape=self.shape, order=1, diameter=90, height=40, circumference=250
        )
        self.assertEqual(Dimensions.shape_circumference(self.shape), 250)

    def test_circumference_none_when_all_null(self):
        models.ShapeSection.objects.create(
            shape=self.shape, order=0, diameter=50, height=30, circumference=None
        )
        self.assertIsNone(Dimensions.shape_circumference(self.shape))

    def test_height_is_sum_and_diameter_is_max(self):
        models.ShapeSection.objects.create(
            shape=self.shape, order=0, diameter=50, height=30, circumference=160
        )
        models.ShapeSection.objects.create(
            shape=self.shape, order=1, diameter=90, height=40, circumference=300
        )
        self.assertEqual(Dimensions.shape_height(self.shape), 70)
        self.assertEqual(Dimensions.shape_diameter(self.shape), 90)

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
