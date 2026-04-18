from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from . import models


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


class ShapeCircumferenceTests(TestCase):
    def setUp(self):
        self.shape = models.Shape.objects.create(top_section_shape=models.Shape.EGG)

    def test_max_across_set_values(self):
        models.ShapeSection.objects.create(
            shape=self.shape, order=0, diameter=50, height=30, circumference=160
        )
        models.ShapeSection.objects.create(
            shape=self.shape, order=1, diameter=90, height=40, circumference=300
        )
        self.assertEqual(self.shape.get_circumference(), 300)

    def test_ignores_nulls(self):
        models.ShapeSection.objects.create(
            shape=self.shape, order=0, diameter=50, height=30, circumference=None
        )
        models.ShapeSection.objects.create(
            shape=self.shape, order=1, diameter=90, height=40, circumference=250
        )
        self.assertEqual(self.shape.get_circumference(), 250)

    def test_none_when_all_null(self):
        models.ShapeSection.objects.create(
            shape=self.shape, order=0, diameter=50, height=30, circumference=None
        )
        self.assertIsNone(self.shape.get_circumference())


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
        self.assertEqual(response.data["circumference"], 220)

    def test_create_rejects_when_no_section_has_circumference(self):
        response = self.client.post(
            "/toys/toys/",
            _payload(section_circumferences=(None, None, None)),
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("sections", str(response.content))
