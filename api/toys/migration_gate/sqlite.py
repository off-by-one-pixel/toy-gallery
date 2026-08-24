"""SQLite implementation of the CandidatePipeline."""

from __future__ import annotations

import sqlite3
from datetime import UTC, datetime
from pathlib import Path

from . import (
    CandidateHandle,
    SubprocessCandidatePipeline,
    gate_state_dir,
    live_db_path,
)
from .archive_store import ArchiveStore

ENGINE_EXT = "sqlite3"


def candidate_db_path() -> Path:
    return gate_state_dir() / f"candidate.{ENGINE_EXT}"


def _candidate_tmp_path() -> Path:
    return candidate_db_path().with_suffix(f".{ENGINE_EXT}.tmp")


class SqliteCandidatePipeline(SubprocessCandidatePipeline):
    def candidate_db_override(self, candidate: CandidateHandle) -> str:
        return str(candidate.path)

    def create_from_live(self, plan_hash: str) -> CandidateHandle:
        live = live_db_path()
        candidate = candidate_db_path()
        if not live.exists():
            raise FileNotFoundError(f"Live database not found at {live}")
        if candidate.exists():
            # The gate's stale-cleanup step runs ahead of this; reaching here
            # means cleanup was bypassed or failed.
            raise FileExistsError(f"Candidate already exists at {candidate}; stale-cleanup failed")

        # Online .backup is safe against concurrent writers on `live`; routing
        # through .tmp keeps a half-written file from being mistaken for a
        # valid candidate if we crash mid-copy.
        tmp = _candidate_tmp_path()
        if tmp.exists():
            tmp.unlink()
        src = sqlite3.connect(str(live))
        try:
            dst = sqlite3.connect(str(tmp))
            try:
                src.backup(dst)
            finally:
                dst.close()
        finally:
            src.close()
        tmp.rename(candidate)

        return CandidateHandle(path=candidate, plan_hash=plan_hash)

    def verify(self, candidate: CandidateHandle) -> None:
        conn = sqlite3.connect(str(candidate.path))
        try:
            cur = conn.execute("PRAGMA integrity_check")
            result = cur.fetchone()
        finally:
            conn.close()
        if not result or result[0] != "ok":
            raise RuntimeError(f"SQLite integrity_check failed on candidate: {result!r}")

    def promote(self, candidate: CandidateHandle, migration_head: str) -> Path:
        archives = ArchiveStore.dir()
        archives.mkdir(parents=True, exist_ok=True)
        ts = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
        counter = ArchiveStore.next_counter(ts, migration_head, ENGINE_EXT)
        archive_path = archives / ArchiveStore.filename(ts, migration_head, counter, ENGINE_EXT)

        live_db_path().rename(archive_path)
        candidate.path.rename(live_db_path())

        return archive_path

    def discard(self, candidate: CandidateHandle) -> None:
        candidate.path.unlink(missing_ok=True)
        _candidate_tmp_path().unlink(missing_ok=True)

    def cleanup_stale(self) -> bool:
        cleaned = False
        candidate = candidate_db_path()
        if candidate.exists():
            candidate.unlink()
            cleaned = True
        tmp = _candidate_tmp_path()
        if tmp.exists():
            tmp.unlink()
            cleaned = True
        return cleaned
