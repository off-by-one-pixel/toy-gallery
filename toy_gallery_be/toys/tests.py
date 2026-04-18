from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

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

    def test_to_dual_rounds_and_handles_none(self):
        self.assertIsNone(Dimensions.to_dual(None))
        self.assertEqual(Dimensions.to_dual(254), {"mm": 254.0, "in": 10.0})
        self.assertEqual(Dimensions.to_dual(170), {"mm": 170.0, "in": 6.693})


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
        self.assertEqual(response.data["insertable_length"], {"mm": 170.0, "in": 6.693})
        self.assertEqual(response.data["circumference"], {"mm": 220.0, "in": 8.661})

    def test_create_rejects_when_no_section_has_circumference(self):
        response = self.client.post(
            "/toys/toys/",
            _payload(section_circumferences=(None, None, None)),
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("sections", str(response.content))

    def test_response_wraps_every_dimension_in_mm_in(self):
        response = self.client.post(
            "/toys/toys/",
            _payload(section_circumferences=(None, 220.0, None)),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        data = response.data
        # Toy-level derived dims
        for field in ("height", "diameter", "circumference", "insertable_length"):
            self.assertIsInstance(data[field], dict, field)
            self.assertIn("mm", data[field])
            self.assertIn("in", data[field])
        # Each section
        for section in data["shape"]["sections"]:
            for field in ("height", "diameter"):
                self.assertIsInstance(section[field], dict, field)
                self.assertIn("mm", section[field])
                self.assertIn("in", section[field])
        # Null sections circumference stays null (not wrapped)
        null_sections = [s for s in data["shape"]["sections"] if s["circumference"] is None]
        self.assertTrue(null_sections)

    def test_mm_inches_conversion(self):
        response = self.client.post(
            "/toys/toys/",
            _payload(section_circumferences=(None, 254.0, None)),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        # 254 mm = exactly 10 inches
        self.assertEqual(response.data["circumference"], {"mm": 254.0, "in": 10.0})
