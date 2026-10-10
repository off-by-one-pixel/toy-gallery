from datetime import UTC, datetime

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from . import models

SESSION_START = "2026-06-01T10:00:00Z"


def utc(iso: str) -> datetime:
    return datetime.fromisoformat(iso).replace(tzinfo=UTC)


def _payload(section_circumferences=(None, None, None), **fields):
    return {
        "brand": "Acme",
        "name": "Demo",
        "size": "M",
        "color": "#c4b5fd",
        "insertable_length": 170,
        "total_length": 210,
        "circumference": 220.0,
        "shape": {
            "top_section_shape": "EGG",
            "sections": [
                {"order": idx, "diameter": 70, "height": 30, "circumference": c}
                for idx, c in enumerate(section_circumferences)
            ],
        },
        **fields,
    }


class ApiTestBase(TestCase):
    password = "p"
    default_involvement = "USED"
    session_default_toy_id: int | None = None

    def setUp(self):
        self.user = User.objects.create_user(username="u", password=self.password)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _post_toy(self, **fields):
        payload = _payload((None, 220.0, None), **fields)
        response = self.client.post("/toys/toys/", payload, format="json")
        self.assertEqual(response.status_code, 201, response.content)
        return response.data

    def _create_toy(self, name="Demo", **fields):
        return self._post_toy(name=name, **fields)["id"]

    def _post_session(self, entries, started_at=SESSION_START, status=201, **fields):
        return self._send_session("post", "/toys/sessions/", entries, started_at, status, fields)

    def _put_session(self, session_id, entries, started_at=SESSION_START, status=200, **fields):
        url = f"/toys/sessions/{session_id}/"
        return self._send_session("put", url, entries, started_at, status, fields)

    def _send_session(self, method, url, entries, started_at, status, fields):
        payload = {"started_at": started_at, "entries": entries, **fields}
        response = getattr(self.client, method)(url, payload, format="json")
        self.assertEqual(response.status_code, status, response.content)
        return response.data

    def _make_session(self, started_at, entries=(), ended_at=None, **fields):
        session = models.Session.objects.create(started_at=started_at, ended_at=ended_at, **fields)
        for entry in entries:
            models.ToySessionEntry.objects.create(
                session=session,
                toy_id=entry.get("toy", self.session_default_toy_id),
                involvement=entry.get("involvement", self.default_involvement),
                duration_minutes=entry.get("duration_minutes"),
            )
        return session

    def _give_record(self, session, key="pr-width", value=220.0):
        return models.PersonalRecord.objects.create(
            key=key, session=session, toy_entry=session.entries.first(), value=value
        )
