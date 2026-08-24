"""Runtime entry point for the safety contract in docs/migration-safety.md.

Orchestration is engine-agnostic; engine-specific work happens behind the
CandidatePipeline interface in toys/migration_gate/.
"""

from __future__ import annotations

import errno
import fcntl
import os
import sys
from contextlib import contextmanager
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connections
from django.db.migrations.executor import MigrationExecutor
from django.db.migrations.loader import MigrationLoader
from django.db.migrations.recorder import MigrationRecorder

from toys.migration_gate import (
    CandidateHandle,
    CandidatePipeline,
    compute_plan_hash,
    get_pipeline,
    live_db_path,
    lock_path,
    marker_path,
)
from toys.migration_gate.archive_store import ArchiveStore

LOG_PREFIX = "[migration-gate]"


class Command(BaseCommand):
    help = "Run pending migrations safely behind a candidate-and-promote gate."

    def handle(self, *args, **options) -> None:
        # The entrypoint creates this in production; tests may not.
        live_db_path().parent.mkdir(parents=True, exist_ok=True)

        try:
            with _flock(lock_path()):
                self._run_gate()
        except _GateAbort as abort:
            self.stderr.write(f"{LOG_PREFIX} {abort}")
            sys.exit(1)

    def _run_gate(self) -> None:
        pipeline = get_pipeline()
        if not self._prepare_for_candidate_build(pipeline):
            return
        candidate = self._build_and_validate_candidate(pipeline)
        self._promote_candidate(pipeline, candidate)

    def _live_migration_head(self) -> str:
        # "Head" identifies the schema state at archive creation: the
        # alphabetically-last applied migration name across all apps. Stable
        # and unique per state, and what `ArchiveStore.filename` encodes.
        connection = connections["default"]
        applied = MigrationRecorder(connection).applied_migrations()
        if not applied:
            return "empty"
        return max(f"{app}.{name}" for app, name in applied.keys())

    def _prepare_for_candidate_build(self, pipeline: CandidatePipeline) -> bool:
        """Returns False to short-circuit the gate when nothing's pending."""
        self._cleanup_stale_candidate(pipeline)
        self._refuse_downgrade_if_detected()
        if not self._has_pending_migrations():
            self.stdout.write(f"{LOG_PREFIX} no pending migrations")
            return False
        self._prune_archives()
        return True

    def _build_and_validate_candidate(self, pipeline) -> CandidateHandle:
        plan_hash = self._compute_pending_plan_hash()
        candidate = self._run_step(
            f"creating candidate (plan {plan_hash})",
            lambda: pipeline.create_from_live(plan_hash),
        )
        # The marker is only ours after `_write_marker` returns; an O_EXCL
        # abort means it belongs to another instance and we must not touch it.
        marker_is_ours = False
        try:
            self._run_step("verifying candidate", lambda: pipeline.verify(candidate))
            self._write_marker(candidate)
            marker_is_ours = True
            self._run_step(
                "applying migrations to candidate",
                lambda: pipeline.apply_migrations(candidate),
            )
            self._run_step(
                "smoke testing candidate",
                lambda: pipeline.smoke_test(candidate),
            )
        except _GateAbort:
            self._cleanup_after_abort(pipeline, candidate, marker_is_ours)
            raise
        return candidate

    def _promote_candidate(self, pipeline, candidate: CandidateHandle) -> None:
        # A partial promote leaves the filesystem in a transitional state
        # that the gate must NOT auto-fix — auto-discard here could destroy
        # the only valid DB. Surface the state and let the operator finish.
        head = self._live_migration_head()
        self.stdout.write(f"{LOG_PREFIX} promoting candidate")
        try:
            archive_path = pipeline.promote(candidate, head)
        except Exception as err:
            raise _GateAbort(
                f"FATAL: promote failed partway: {err}. "
                f"Check {live_db_path()}, {candidate.path}, and {ArchiveStore.dir()}."
            ) from err
        self.stdout.write(f"{LOG_PREFIX} promoted; archive at {archive_path}")
        marker_path().unlink(missing_ok=True)

    def _run_step(self, label: str, fn):
        """Log `label`, call `fn`, and wrap any unhandled error as a
        _GateAbort tagged with `label` so the gate logs a consistent message
        before exiting.
        """
        self.stdout.write(f"{LOG_PREFIX} {label}")
        try:
            return fn()
        except _GateAbort:
            raise
        except Exception as err:
            raise _GateAbort(f"{label} failed: {err}") from err

    def _cleanup_after_abort(
        self, pipeline, candidate: CandidateHandle, marker_is_ours: bool
    ) -> None:
        # Suppress errors so the abort message that triggered cleanup is
        # what the operator actually sees.
        try:
            pipeline.discard(candidate)
        except Exception:
            pass
        if marker_is_ours:
            marker_path().unlink(missing_ok=True)

    def _prune_archives(self) -> None:
        # Prune ahead of new candidate creation, so a wedged-disk run can
        # recover by deleting old archives first.
        pruned = ArchiveStore.prune(settings.MIGRATION_ARCHIVE_RETAIN)
        if pruned:
            self.stdout.write(f"{LOG_PREFIX} pruned {len(pruned)} old archive(s)")

    # ---------- Stale candidate cleanup ----------

    def _cleanup_stale_candidate(self, pipeline: CandidatePipeline) -> None:
        cleaned = pipeline.cleanup_stale()
        if marker_path().exists():
            marker_path().unlink()
            cleaned = True
        if cleaned:
            self.stdout.write(f"{LOG_PREFIX} cleared stale candidate from prior run")

    # ---------- Downgrade refusal ----------

    def _refuse_downgrade_if_detected(self) -> None:
        connection = connections["default"]
        recorder = MigrationRecorder(connection)
        try:
            applied = recorder.applied_migrations()
        except Exception:
            # Fresh install: django_migrations table doesn't exist yet.
            return

        loader = MigrationLoader(connection, ignore_no_migrations=True)
        on_disk = set(loader.disk_migrations.keys())
        # Squashed migrations also surface in django_migrations under the
        # names they replace; treat those names as known to the code too.
        for _, migration in loader.disk_migrations.items():
            for replaced in getattr(migration, "replaces", ()) or ():
                on_disk.add(tuple(replaced))

        unknown = set(applied.keys()) - on_disk
        if not unknown:
            return

        applied_heads = sorted(f"{app}.{name}" for app, name in unknown)
        raise _GateAbort(
            "FATAL: image is older than the database.\n"
            f"  DB has applied migrations the code does not know: {applied_heads}\n"
            "  Downgrades are not supported.\n"
            "  Pull an image whose code knows these migrations, OR while the\n"
            f"  container is stopped manually replace {live_db_path()} with an\n"
            f"  appropriate archive from {ArchiveStore.dir()} — note that manual\n"
            "  restore discards data written since the archive's timestamp."
        )

    # ---------- Pending check ----------

    def _has_pending_migrations(self) -> bool:
        connection = connections["default"]
        loader = MigrationLoader(connection)
        executor = MigrationExecutor(connection, progress_callback=None)
        plan = executor.migration_plan(loader.graph.leaf_nodes())
        return bool(plan)

    def _compute_pending_plan_hash(self) -> str:
        connection = connections["default"]
        loader = MigrationLoader(connection)
        executor = MigrationExecutor(connection, progress_callback=None)
        plan = executor.migration_plan(loader.graph.leaf_nodes())
        return compute_plan_hash(plan)

    # ---------- Marker ----------

    def _write_marker(self, candidate: CandidateHandle) -> None:
        """On success the marker exists and is owned by this run. On any
        raise the marker is in its pre-call state — either non-existent or
        owned by another run (O_EXCL case).
        """
        payload = f"candidate={candidate.path}\nplan_hash={candidate.plan_hash}\n"
        try:
            fd = os.open(str(marker_path()), os.O_CREAT | os.O_WRONLY | os.O_EXCL, 0o644)
        except OSError as err:
            if err.errno == errno.EEXIST:
                try:
                    existing = marker_path().read_text()
                except OSError:
                    existing = "<unreadable>"
                raise _GateAbort(
                    "FATAL: in-progress marker already exists; another gate "
                    "instance may be running or a prior run failed to clean up.\n"
                    f"  Marker path: {marker_path()}\n  Marker contents: {existing!r}"
                ) from err
            raise _GateAbort(f"failed to create marker {marker_path()}: {err}") from err

        try:
            try:
                os.write(fd, payload.encode("utf-8"))
                os.fsync(fd)
            finally:
                os.close(fd)
            # Don't trust the fsync alone — re-read to catch a dropped write.
            actual = marker_path().read_text()
            if actual != payload:
                raise _GateAbort(f"marker read-back mismatch: wrote {payload!r}, read {actual!r}")
        except (OSError, _GateAbort):
            # The file is ours (O_EXCL succeeded); roll back so the caller
            # sees the same "no marker" state it had before this call.
            marker_path().unlink(missing_ok=True)
            raise


class _GateAbort(Exception):
    """Caught by handle() to translate any abort into exit 1 with a log line."""


@contextmanager
def _flock(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(str(path), os.O_CREAT | os.O_WRONLY, 0o644)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX)
        yield
    finally:
        try:
            fcntl.flock(fd, fcntl.LOCK_UN)
        finally:
            os.close(fd)
