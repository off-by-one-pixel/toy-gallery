from __future__ import annotations

import sqlite3
import tempfile
from collections import namedtuple
from io import StringIO
from pathlib import Path
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase, override_settings

from toys.migration_gate import (
    CandidateHandle,
    CandidatePipeline,
    compute_plan_hash,
    live_db_path,
    marker_path,
)
from toys.migration_gate.archive_store import ArchiveStore
from toys.migration_gate.sqlite import candidate_db_path
from toys.models import Shape, ShapeSection, Toy

# ---------- Test helpers ----------


class TempDataDir:
    """Helper that points the live DB (and therefore all gate state) at a tmp dir.

    The gate derives every path from `settings.DATABASES['default']['NAME']`,
    so we just override that for the duration of the test. The `path` attribute
    is the parent dir; gate state lands as siblings of the live DB file.
    """

    def __init__(self, test_case: TestCase) -> None:
        self._tmpdir = tempfile.TemporaryDirectory(prefix="mgate-test-")
        self.path = Path(self._tmpdir.name)
        override = override_settings(
            DATABASES={
                "default": {
                    "ENGINE": "django.db.backends.sqlite3",
                    "NAME": str(self.path / "db.sqlite3"),
                }
            }
        )
        override.enable()
        test_case.addCleanup(override.disable)
        test_case.addCleanup(self._tmpdir.cleanup)


def make_sqlite_with_table(path: Path, rows: int = 3) -> None:
    """Create a tiny SQLite DB at `path` with a known table and row count."""
    conn = sqlite3.connect(str(path))
    try:
        conn.execute("CREATE TABLE things (id INTEGER PRIMARY KEY, name TEXT)")
        for i in range(rows):
            conn.execute("INSERT INTO things (name) VALUES (?)", (f"row-{i}",))
        conn.commit()
    finally:
        conn.close()


def row_count(path: Path) -> int:
    conn = sqlite3.connect(str(path))
    try:
        cur = conn.execute("SELECT COUNT(*) FROM things")
        return cur.fetchone()[0]
    finally:
        conn.close()


# ---------- Pure helpers ----------


class ComputePlanHashTests(TestCase):
    def test_deterministic_for_same_plan(self):
        Migration = namedtuple("Migration", ["app_label", "name"])
        plan = [
            (Migration("toys", "0001_initial"), False),
            (Migration("toys", "0002_thing"), False),
        ]
        self.assertEqual(compute_plan_hash(plan), compute_plan_hash(plan))

    def test_changes_when_plan_changes(self):
        Migration = namedtuple("Migration", ["app_label", "name"])
        plan_a = [(Migration("toys", "0001_initial"), False)]
        plan_b = [(Migration("toys", "0002_thing"), False)]
        self.assertNotEqual(compute_plan_hash(plan_a), compute_plan_hash(plan_b))

    def test_empty_plan_yields_stable_hash(self):
        self.assertEqual(compute_plan_hash([]), compute_plan_hash([]))


# ---------- Gate orchestration ----------


class _MockPipeline(CandidatePipeline):
    """Pipeline double that records calls; lets tests force specific outcomes."""

    def __init__(self, *, fail_on: str | None = None):
        self.calls: list[str] = []
        self.fail_on = fail_on

    def _maybe_fail(self, name: str) -> None:
        self.calls.append(name)
        if self.fail_on == name:
            raise RuntimeError(f"mock pipeline configured to fail on {name}")

    def create_from_live(self, plan_hash: str) -> CandidateHandle:
        self._maybe_fail("create_from_live")
        return CandidateHandle(path=candidate_db_path(), plan_hash=plan_hash)

    def verify(self, candidate: CandidateHandle) -> None:
        self._maybe_fail("verify")

    def apply_migrations(self, candidate: CandidateHandle) -> None:
        self._maybe_fail("apply_migrations")

    def smoke_test(self, candidate: CandidateHandle) -> None:
        self._maybe_fail("smoke_test")

    def promote(self, candidate: CandidateHandle, migration_head: str) -> Path:
        self._maybe_fail("promote")
        ArchiveStore.dir().mkdir(parents=True, exist_ok=True)
        archive = ArchiveStore.dir() / "mock-archive.sqlite3"
        archive.write_text("mock")
        return archive

    def discard(self, candidate: CandidateHandle) -> None:
        self._maybe_fail("discard")

    def cleanup_stale(self) -> bool:
        self._maybe_fail("cleanup_stale")
        return False


class GateNoPendingFastPathTests(TestCase):
    """No-pending-migrations path: the gate must not create a candidate or archive."""

    def setUp(self):
        TempDataDir(self)

    def test_no_pending_runs_fast_path(self):
        # In the test DB, all migrations are already applied → no pending.
        out = StringIO()
        call_command("safe_migrate", stdout=out)
        output = out.getvalue()
        self.assertIn("no pending migrations", output)
        self.assertFalse(candidate_db_path().exists())
        self.assertFalse(ArchiveStore.dir().exists())


class GateMarkerExclusiveTests(TestCase):
    """If marker exists at step 7, the gate aborts and discards the candidate."""

    def setUp(self):
        TempDataDir(self)
        live_db_path().parent.mkdir(parents=True, exist_ok=True)

    def test_marker_oexcl_aborts_when_marker_appears_after_cleanup(self):
        """Belt-and-suspenders: step 7's O_EXCL refuses to overwrite a marker.

        Simulate the race by patching the step-2 cleanup to a no-op AND
        pre-creating the marker. The gate then reaches step 7, attempts an
        atomic create-or-fail, and aborts with a clear message.
        """
        marker_path().write_text("simulated concurrent run")
        pipeline = _MockPipeline()

        cmd_module = __import__("toys.management.commands.safe_migrate", fromlist=["Command"])
        with (
            mock.patch("toys.management.commands.safe_migrate.get_pipeline", return_value=pipeline),
            mock.patch.object(cmd_module.Command, "_cleanup_stale_candidate"),
            mock.patch.object(cmd_module.Command, "_has_pending_migrations", return_value=True),
            mock.patch.object(
                cmd_module.Command, "_compute_pending_plan_hash", return_value="testhash"
            ),
        ):
            err = StringIO()
            with self.assertRaises(SystemExit) as ctx:
                call_command("safe_migrate", stderr=err)
            self.assertEqual(ctx.exception.code, 1)
            self.assertIn("marker already exists", err.getvalue())

        # Marker is left in place — operator inspects it.
        self.assertTrue(marker_path().exists())
        # The mock pipeline got a discard call (cleanup of the candidate it had
        # just been asked to create).
        self.assertIn("discard", pipeline.calls)


class GateStaleCandidateCleanupTests(TestCase):
    """A stale candidate from a killed prior run is cleaned up in step 2."""

    def setUp(self):
        TempDataDir(self)
        live_db_path().parent.mkdir(parents=True, exist_ok=True)

    def test_stale_candidate_and_marker_cleared(self):
        candidate_db_path().write_text("stale candidate")
        marker_path().write_text("stale marker")
        out = StringIO()
        call_command("safe_migrate", stdout=out)
        self.assertIn("cleared stale candidate", out.getvalue())
        self.assertFalse(candidate_db_path().exists())
        self.assertFalse(marker_path().exists())


class GateDowngradeRefusalTests(TestCase):
    """Step 3: if the DB has migrations the code doesn't know, halt."""

    def setUp(self):
        TempDataDir(self)
        live_db_path().parent.mkdir(parents=True, exist_ok=True)

    def test_unknown_applied_migration_refuses_to_start(self):
        # Insert a fake migration into the test DB's django_migrations table
        # that the code does not know about. Use a name guaranteed not to exist
        # on disk.
        from django.db import connections
        from django.db.migrations.recorder import MigrationRecorder

        recorder = MigrationRecorder(connections["default"])
        recorder.ensure_schema()
        recorder.record_applied("nonexistent_app", "9999_fake_migration")

        err = StringIO()
        with self.assertRaises(SystemExit) as ctx:
            call_command("safe_migrate", stderr=err)
        self.assertEqual(ctx.exception.code, 1)
        message = err.getvalue()
        self.assertIn("FATAL", message)
        self.assertIn("image is older than the database", message)
        self.assertIn("9999_fake_migration", message)

        # Cleanup so we don't pollute later tests in the same process.
        recorder.record_unapplied("nonexistent_app", "9999_fake_migration")


class SmokeTestLayersTests(TestCase):
    def test_passes_on_clean_db(self):
        out = StringIO()
        call_command("migration_smoke_test", stdout=out)
        output = out.getvalue()
        self.assertIn("layer 1 (structural) ok", output)
        self.assertIn("layer 2 (referential) ok", output)
        self.assertIn("layer 3 (invariants) ok", output)
        self.assertIn("layer 4 (api) skipped", output)

    def test_invariants_accept_section_circumferences_without_a_toy_circumference(self):
        shape = Shape.objects.create()
        ShapeSection.objects.create(
            shape=shape, order=0, diameter=70, height=30, circumference=220.0
        )
        Toy.objects.create(brand="Acme", name="Demo", size="M", shape=shape)
        out = StringIO()
        call_command("migration_smoke_test", stdout=out)
        self.assertIn("layer 3 (invariants) ok", out.getvalue())

    @mock.patch("toys.management.commands.migration_smoke_test.run_invariants")
    def test_layer_3_failure_propagates(self, mock_run_invariants):
        mock_run_invariants.side_effect = AssertionError("invariant broken")
        err = StringIO()
        with self.assertRaises(SystemExit) as ctx:
            call_command("migration_smoke_test", stderr=err)
        self.assertEqual(ctx.exception.code, 1)
        self.assertIn("invariant broken", err.getvalue())

    @override_settings(MIGRATION_SMOKE_TEST_PATHS=[])
    def test_layer_4_skipped_when_no_paths_configured(self):
        out = StringIO()
        call_command("migration_smoke_test", stdout=out)
        self.assertIn("layer 4 (api) skipped: no paths configured", out.getvalue())

    @override_settings(MIGRATION_SMOKE_TEST_PATHS=["/foo/"])
    def test_layer_4_skipped_without_superuser(self):
        get_user_model().objects.all().delete()
        out = StringIO()
        call_command("migration_smoke_test", stdout=out)
        self.assertIn("no superuser yet", out.getvalue())

    @override_settings(MIGRATION_SMOKE_TEST_PATHS=["/toys/toys/"])
    def test_layer_4_runs_when_superuser_exists(self):
        get_user_model().objects.create_superuser("admin", "admin@example.com", "pw1234567890")
        out = StringIO()
        call_command("migration_smoke_test", stdout=out)
        self.assertIn("GET /toys/toys/", out.getvalue())
