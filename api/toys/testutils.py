from datetime import UTC, datetime

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from . import models
from .tests import _payload

_UNSET = object()


def utc(iso: str) -> datetime:
    return datetime.fromisoformat(iso).replace(tzinfo=UTC)


class SessionApiTestBase(TestCase):
    default_involvement = "USED"
    session_default_toy_id: int | None = None

    def setUp(self):
        user = User.objects.create_user(username="u", password="p")
        self.client = APIClient()
        self.client.force_authenticate(user=user)

    def _create_toy(self, name, *, circumference=_UNSET, insertable_length=_UNSET):
        payload = _payload(section_circumferences=(None, 220.0, None))
        payload["name"] = name
        if circumference is not _UNSET:
            payload["circumference"] = circumference
        if insertable_length is not _UNSET:
            payload["insertable_length"] = insertable_length
        response = self.client.post("/toys/toys/", payload, format="json")
        self.assertEqual(response.status_code, 201, response.content)
        return response.data["id"]

    def _make_session(self, started_at, entries=(), ended_at=None):
        session = models.Session.objects.create(started_at=started_at, ended_at=ended_at)
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
