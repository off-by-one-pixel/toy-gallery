"""Tests for SqliteCandidatePipeline: candidate creation, verify, promote, discard."""

from __future__ import annotations

import sqlite3

from django.test import TestCase

from toys.migration_gate import (
    CandidateHandle,
    get_pipeline,
    live_db_path,
)
from toys.migration_gate.sqlite import SqliteCandidatePipeline, candidate_db_path
from toys.test_migration_gate import TempDataDir, make_sqlite_with_table, row_count


class SqliteCandidatePipelineTests(TestCase):
    def setUp(self):
        TempDataDir(self)
        live_db_path().parent.mkdir(parents=True, exist_ok=True)
        make_sqlite_with_table(live_db_path(), rows=5)
        self.pipeline = SqliteCandidatePipeline()

    def test_create_from_live_copies_data(self):
        handle = self.pipeline.create_from_live("abc12345")
        self.assertTrue(handle.path.exists())
        self.assertEqual(handle.path, candidate_db_path())
        self.assertEqual(row_count(handle.path), 5)

    def test_create_from_live_refuses_when_candidate_exists(self):
        candidate_db_path().write_text("stale")
        with self.assertRaises(FileExistsError):
            self.pipeline.create_from_live("abc12345")

    def test_create_from_live_refuses_when_live_missing(self):
        live_db_path().unlink()
        with self.assertRaises(FileNotFoundError):
            self.pipeline.create_from_live("abc12345")

    def test_verify_passes_on_clean_db(self):
        handle = self.pipeline.create_from_live("abc12345")
        self.pipeline.verify(handle)

    def test_verify_fails_on_corrupted_file(self):
        candidate_db_path().write_bytes(b"\x00" * 4096)
        handle = CandidateHandle(path=candidate_db_path(), plan_hash="x")
        # Either a sqlite3 error (unreadable file) or a RuntimeError
        # (integrity_check failed) is an acceptable signal of corruption.
        with self.assertRaises((sqlite3.DatabaseError, RuntimeError)):
            self.pipeline.verify(handle)

    def test_promote_renames_live_to_archive_and_candidate_to_live(self):
        # Distinguish live (5 rows) and candidate (8 rows) by content.
        handle = self.pipeline.create_from_live("abc12345")
        conn = sqlite3.connect(str(handle.path))
        try:
            for i in range(3):
                conn.execute("INSERT INTO things (name) VALUES (?)", (f"extra-{i}",))
            conn.commit()
        finally:
            conn.close()
        self.assertEqual(row_count(handle.path), 8)
        self.assertEqual(row_count(live_db_path()), 5)

        archive_path = self.pipeline.promote(handle, "toys.0014_x")

        self.assertEqual(row_count(live_db_path()), 8)
        self.assertTrue(archive_path.exists())
        self.assertEqual(row_count(archive_path), 5)
        self.assertIn("toys.0014_x", archive_path.name)
        self.assertFalse(handle.path.exists())

    def test_discard_removes_candidate(self):
        handle = self.pipeline.create_from_live("abc12345")
        self.pipeline.discard(handle)
        self.assertFalse(handle.path.exists())

    def test_get_pipeline_returns_sqlite_for_sqlite_engine(self):
        self.assertIsInstance(get_pipeline(), SqliteCandidatePipeline)
