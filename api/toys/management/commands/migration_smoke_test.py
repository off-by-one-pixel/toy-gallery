from __future__ import annotations

import sys

from django.apps import apps
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand

from toy_gallery.migration_invariants import check as run_invariants

LOG_PREFIX = "[smoke]"


class Command(BaseCommand):
    help = "Verify that the database is consistent with the running code."

    def handle(self, *args, **options) -> None:
        try:
            self._layer_1_structural()
            self._layer_2_referential()
            self._layer_3_invariant_hook()
            self._layer_4_api_paths()
        except SmokeTestFailure as err:
            self.stderr.write(f"{LOG_PREFIX} FAIL: {err}")
            sys.exit(1)
        self.stdout.write(f"{LOG_PREFIX} all layers passed")

    def _layer_1_structural(self) -> None:
        try:
            call_command("migrate", "--check", verbosity=0)
        except SystemExit as exit_err:
            if int(getattr(exit_err, "code", 0) or 0) != 0:
                raise SmokeTestFailure(
                    "layer 1: `migrate --check` reports pending migrations"
                ) from exit_err
        try:
            call_command("check", "--database", "default", verbosity=0)
        except SystemExit as exit_err:
            if int(getattr(exit_err, "code", 0) or 0) != 0:
                raise SmokeTestFailure("layer 1: `check --database default` failed") from exit_err
        self.stdout.write(f"{LOG_PREFIX} layer 1 (structural) ok")

    def _layer_2_referential(self) -> None:
        for app_label in settings.LOCAL_APPS:
            app_config = apps.get_app_config(app_label)
            for model in app_config.get_models():
                try:
                    model.objects.exists()
                except Exception as err:
                    raise SmokeTestFailure(
                        f"layer 2: query on {model._meta.label} raised {type(err).__name__}: {err}"
                    ) from err
        self.stdout.write(f"{LOG_PREFIX} layer 2 (referential) ok")

    def _layer_3_invariant_hook(self) -> None:
        try:
            run_invariants()
        except Exception as err:
            raise SmokeTestFailure(
                f"layer 3: invariant raised {type(err).__name__}: {err}"
            ) from err
        self.stdout.write(f"{LOG_PREFIX} layer 3 (invariants) ok")

    def _layer_4_api_paths(self) -> None:
        paths = getattr(settings, "MIGRATION_SMOKE_TEST_PATHS", [])
        if not paths:
            self.stdout.write(f"{LOG_PREFIX} layer 4 (api) skipped: no paths configured")
            return

        superuser = get_user_model().objects.filter(is_superuser=True).first()
        if superuser is None:
            self.stdout.write(f"{LOG_PREFIX} layer 4 (api) skipped: no superuser yet")
            return

        from django.test import Client

        client = Client()
        client.force_login(superuser)

        for path in paths:
            try:
                response = client.get(path)
            except Exception as err:
                raise SmokeTestFailure(
                    f"layer 4: GET {path} raised {type(err).__name__}: {err}"
                ) from err
            if response.status_code >= 500:
                raise SmokeTestFailure(f"layer 4: GET {path} returned {response.status_code}")
            self.stdout.write(f"{LOG_PREFIX} layer 4: GET {path} → {response.status_code}")


class SmokeTestFailure(Exception):
    pass
