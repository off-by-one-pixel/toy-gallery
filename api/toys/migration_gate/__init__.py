"""Interfaces, helpers, and registry for the migration safety gate.

Implements the contract in docs/migration-safety.md. Consumed by
toys.management.commands.safe_migrate.
"""

from __future__ import annotations

import hashlib
import os
from abc import ABC, abstractmethod
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path

from django.conf import settings


def live_db_path() -> Path:
    # SQLite v1 only — Postgres won't have a single file path and will
    # need its own state-dir logic when added.
    name = settings.DATABASES["default"]["NAME"]
    return Path(name)


def gate_state_dir() -> Path:
    # Sibling-of-live-DB by design: same filesystem so promote's rename pair
    # is atomic, and the same volume the operator already mounts.
    return live_db_path().parent


def lock_path() -> Path:
    return gate_state_dir() / ".migration.lock"


def marker_path() -> Path:
    return gate_state_dir() / ".migration.in_progress"


@dataclass(frozen=True)
class CandidateHandle:
    path: Path
    plan_hash: str


class CandidatePipeline(ABC):
    """Engine-agnostic interface for the gate's working-copy operations."""

    @abstractmethod
    def create_from_live(self, plan_hash: str) -> CandidateHandle: ...

    @abstractmethod
    def verify(self, candidate: CandidateHandle) -> None:
        """Raise if the candidate is corrupt."""

    @abstractmethod
    def apply_migrations(self, candidate: CandidateHandle) -> None: ...

    @abstractmethod
    def smoke_test(self, candidate: CandidateHandle) -> None: ...

    @abstractmethod
    def promote(self, candidate: CandidateHandle, migration_head: str) -> Path:
        """Atomically swap candidate into the live position; old live becomes an
        archive. Returns the archive path.
        """

    @abstractmethod
    def discard(self, candidate: CandidateHandle) -> None:
        """Delete the candidate. Live DB is not touched."""

    @abstractmethod
    def cleanup_stale(self) -> bool:
        """Remove any candidate-side state left from a prior killed run.
        Returns True if anything was removed. Live DB is not touched.
        """


class SubprocessCandidatePipeline(CandidatePipeline):
    """Base for engines that drive `manage.py` in a subprocess. Concrete
    engines only declare what value points Django at their candidate; the
    rest is shared.
    """

    @abstractmethod
    def candidate_db_override(self, candidate: CandidateHandle) -> str:
        """Engine-specific value the settings module reads from the override
        env var to swap in the candidate (e.g. a file path for SQLite, a
        database name for Postgres).
        """

    def apply_migrations(self, candidate: CandidateHandle) -> None:
        self._run_manage_subprocess(["migrate", "--noinput"], candidate)

    def smoke_test(self, candidate: CandidateHandle) -> None:
        self._run_manage_subprocess(["migration_smoke_test"], candidate)

    def _run_manage_subprocess(self, manage_args: list[str], candidate: CandidateHandle) -> None:
        import subprocess
        import sys

        env = os.environ.copy()
        env["_MIGRATION_GATE_DB_OVERRIDE"] = self.candidate_db_override(candidate)

        manage_py = _locate_manage_py()
        cmd = [sys.executable, str(manage_py), *manage_args]
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)

        if result.returncode != 0:
            raise RuntimeError(
                f"`manage.py {' '.join(manage_args)}` against candidate failed "
                f"(exit {result.returncode}).\n"
                f"stdout:\n{result.stdout}\nstderr:\n{result.stderr}"
            )


def _locate_manage_py() -> Path:
    # In the Docker image it's at /app/manage.py; in dev/tests it's at the
    # backend project root. Walk up from this file until we find one.
    current = Path(__file__).resolve().parent
    while current != current.parent:
        candidate = current / "manage.py"
        if candidate.exists():
            return candidate
        current = current.parent
    raise FileNotFoundError("Could not locate manage.py from migration_gate package")


# ---------- Pipeline registry ----------


def get_pipeline() -> CandidatePipeline:
    engine = settings.DATABASES["default"]["ENGINE"]
    if engine == "django.db.backends.sqlite3":
        from .sqlite import SqliteCandidatePipeline

        return SqliteCandidatePipeline()
    raise NotImplementedError(
        f"No CandidatePipeline implementation for engine {engine!r}. "
        f"SQLite is supported in v1; Postgres is reserved for v2."
    )


# ---------- Plan-hash helper ----------


def compute_plan_hash(plan: Iterable[tuple]) -> str:
    """8-char digest of a migration plan from MigrationExecutor.migration_plan().
    Stable across runs for the same set of pending operations.
    """
    parts = [f"{migration.app_label}.{migration.name}" for migration, _backwards in plan]
    blob = "|".join(parts).encode("utf-8")
    return hashlib.sha256(blob).hexdigest()[:8]
