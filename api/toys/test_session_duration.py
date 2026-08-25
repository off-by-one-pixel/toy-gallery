from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from .tests import _payload


class SessionTotalDurationTests(TestCase):
    def setUp(self):
        user = User.objects.create_user(username="u", password="p")
        self.client = APIClient()
        self.client.force_authenticate(user=user)
        self.toy_a = self._create_toy("A")
        self.toy_b = self._create_toy("B")

    def _create_toy(self, name):
        payload = _payload()
        payload["name"] = name
        response = self.client.post("/toys/toys/", payload, format="json")
        self.assertEqual(response.status_code, 201, response.content)
        return response.data["id"]

    def _post_session(self, entries):
        response = self.client.post(
            "/toys/sessions/",
            {"started_at": "2026-05-02T21:14:00Z", "entries": entries},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        return response.data

    def test_sums_entry_durations(self):
        data = self._post_session(
            [
                {"toy": self.toy_a, "involvement": "USED", "duration_minutes": 30},
                {"toy": self.toy_b, "involvement": "FULLY_INSERTED", "duration_minutes": 45},
            ]
        )
        self.assertEqual(data["total_toy_duration_minutes"], 75)

    def test_ignores_entries_without_duration(self):
        data = self._post_session(
            [
                {"toy": self.toy_a, "involvement": "USED", "duration_minutes": 30},
                {"toy": self.toy_b, "involvement": "USED"},
            ]
        )
        self.assertEqual(data["total_toy_duration_minutes"], 30)

    def test_null_when_no_entry_has_a_duration(self):
        data = self._post_session([{"toy": self.toy_a, "involvement": "USED"}])
        self.assertIsNone(data["total_toy_duration_minutes"])

    def test_list_and_detail_include_the_total(self):
        created = self._post_session(
            [{"toy": self.toy_a, "involvement": "USED", "duration_minutes": 20}]
        )

        listed = self.client.get("/toys/sessions/")
        self.assertEqual(listed.status_code, 200, listed.content)
        row = next(r for r in listed.data["results"] if r["id"] == created["id"])
        self.assertEqual(row["total_toy_duration_minutes"], 20)

        detail = self.client.get(f"/toys/sessions/{created['id']}/")
        self.assertEqual(detail.status_code, 200, detail.content)
        self.assertEqual(detail.data["total_toy_duration_minutes"], 20)
