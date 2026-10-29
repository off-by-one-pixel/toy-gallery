from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .models import Session
from .testutils import ApiTestBase

URL = "/toys/app_token/"


class AppTokenLifecycleTests(ApiTestBase):
    def test_status_is_empty_before_a_token_exists(self):
        response = self.client.get(URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"created": None})

    def test_create_returns_the_key_once_and_status_reports_it(self):
        created = self.client.post(URL)
        self.assertEqual(created.status_code, 201, created.content)
        token = Token.objects.get(user=self.user)
        self.assertEqual(created.data["key"], token.key)

        status = self.client.get(URL)
        self.assertEqual(status.data["created"], created.data["created"])
        self.assertNotIn("key", status.data)

    def test_create_replaces_the_previous_token(self):
        first = self.client.post(URL).data["key"]
        second = self.client.post(URL).data["key"]
        self.assertNotEqual(first, second)
        self.assertEqual(list(Token.objects.values_list("key", flat=True)), [second])

    def test_delete_revokes_the_token(self):
        key = self.client.post(URL).data["key"]
        response = self.client.delete(URL)
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Token.objects.exists())
        self.assertEqual(_token_client(key).get("/toys/toys/").status_code, 401)

    def test_delete_without_a_token_is_a_no_op(self):
        self.assertEqual(self.client.delete(URL).status_code, 204)

    def test_requires_authentication(self):
        self.assertEqual(APIClient().get(URL).status_code, 401)


class AppTokenAccessTests(ApiTestBase):
    def setUp(self):
        super().setUp()
        self.token_client = _token_client(self.client.post(URL).data["key"])

    def test_reads_data(self):
        self.assertEqual(self.token_client.get("/toys/toys/").status_code, 200)
        stats = self.token_client.get(
            "/toys/sessions/stats/", {"group_by": "date", "metrics": "count"}
        )
        self.assertEqual(stats.status_code, 200, stats.content)

    def test_rejects_writes(self):
        self.assertEqual(self.token_client.post("/toys/toys/", {}, format="json").status_code, 403)
        self.assertEqual(self.token_client.delete("/toys/toys/delete_all/").status_code, 403)
        change = self.token_client.post(
            "/toys/change_password/",
            {"current_password": self.password, "new_password": "BrandNewPwd987"},
            format="json",
        )
        self.assertEqual(change.status_code, 403)

    def test_starts_and_stops_the_live_session(self):
        started = self.token_client.post("/toys/sessions/start/")
        self.assertEqual(started.status_code, 200, started.content)
        self.assertTrue(started.data["is_live"])

        stopped = self.token_client.post("/toys/sessions/stop/")
        self.assertEqual(stopped.status_code, 200, stopped.content)
        self.assertEqual(stopped.data["session"]["id"], started.data["id"])
        self.assertFalse(Session.objects.filter(is_live=True).exists())

    def test_rejects_other_session_writes(self):
        session = Session.objects.create(started_at=timezone.now(), is_live=True)
        detail = f"/toys/sessions/{session.pk}/"
        patch = self.token_client.patch(detail, {"ended_at": None}, format="json")
        self.assertEqual(patch.status_code, 403)
        self.assertEqual(self.token_client.delete(detail).status_code, 403)
        rebuild = self.token_client.post("/toys/sessions/rebuild-records/")
        self.assertEqual(rebuild.status_code, 403)
        self.assertTrue(Session.objects.filter(pk=session.pk, is_live=True).exists())

    def test_cannot_manage_app_tokens(self):
        self.assertEqual(self.token_client.get(URL).status_code, 401)
        self.assertEqual(self.token_client.post(URL).status_code, 401)
        self.assertEqual(self.token_client.delete(URL).status_code, 401)
        self.assertTrue(Token.objects.exists())

    def test_session_tokens_keep_write_access(self):
        pair = APIClient().post(
            "/toys/token/", {"username": "u", "password": self.password}, format="json"
        )
        session = APIClient()
        session.credentials(HTTP_AUTHORIZATION=f"Bearer {pair.data['access']}")
        self.assertEqual(session.delete("/toys/toys/delete_all/").status_code, 200)


def _token_client(key):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Token {key}")
    return client
