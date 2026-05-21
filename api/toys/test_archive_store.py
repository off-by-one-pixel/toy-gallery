"""Tests for ArchiveStore: filename conventions and retention pruning."""

from __future__ import annotations

from pathlib import Path

from django.test import TestCase

from toys.migration_gate.archive_store import ArchiveStore
from toys.test_migration_gate import TempDataDir


class ArchiveFilenameTests(TestCase):
    def setUp(self):
        TempDataDir(self)

    def test_filename_shape(self):
        self.assertEqual(
            ArchiveStore.filename("20260518T120000Z", "toys.0014_x", 1, "sqlite3"),
            "20260518T120000Z-toys.0014_x-1.sqlite3",
        )

    def test_counter_increments_when_same_ts_head(self):
        ArchiveStore.dir().mkdir(parents=True, exist_ok=True)
        ts = "20260518T120000Z"
        head = "toys.0014_x"
        # First counter should be 1; create that archive and counter advances.
        self.assertEqual(ArchiveStore.next_counter(ts, head, "sqlite3"), 1)
        (ArchiveStore.dir() / ArchiveStore.filename(ts, head, 1, "sqlite3")).write_text("x")
        self.assertEqual(ArchiveStore.next_counter(ts, head, "sqlite3"), 2)
        (ArchiveStore.dir() / ArchiveStore.filename(ts, head, 2, "sqlite3")).write_text("x")
        self.assertEqual(ArchiveStore.next_counter(ts, head, "sqlite3"), 3)

    def test_counter_independent_per_head(self):
        ArchiveStore.dir().mkdir(parents=True, exist_ok=True)
        ts = "20260518T120000Z"
        (ArchiveStore.dir() / ArchiveStore.filename(ts, "toys.A", 1, "sqlite3")).write_text("x")
        (ArchiveStore.dir() / ArchiveStore.filename(ts, "toys.A", 2, "sqlite3")).write_text("x")
        # Different head sharing the same ts gets its own sequence.
        self.assertEqual(ArchiveStore.next_counter(ts, "toys.B", "sqlite3"), 1)


class PruneArchivesTests(TestCase):
    def setUp(self):
        TempDataDir(self)
        ArchiveStore.dir().mkdir(parents=True, exist_ok=True)

    def _add_archive(self, ts: str, head: str = "toys.x", counter: int = 1) -> Path:
        name = ArchiveStore.filename(ts, head, counter, "sqlite3")
        path = ArchiveStore.dir() / name
        path.write_text(f"archive {ts}")
        return path

    def test_no_op_when_under_cap(self):
        self._add_archive("20260101T000000Z")
        self._add_archive("20260102T000000Z")
        pruned = ArchiveStore.prune(5)
        self.assertEqual(pruned, [])
        self.assertEqual(sum(1 for _ in ArchiveStore.dir().iterdir()), 2)

    def test_keeps_most_recent_when_over_cap(self):
        self._add_archive("20260101T000000Z")
        self._add_archive("20260102T000000Z")
        self._add_archive("20260103T000000Z")
        pruned = ArchiveStore.prune(2)
        self.assertEqual(len(pruned), 1)
        survivors = sorted(p.name for p in ArchiveStore.dir().iterdir())
        self.assertEqual(
            survivors,
            [
                "20260102T000000Z-toys.x-1.sqlite3",
                "20260103T000000Z-toys.x-1.sqlite3",
            ],
        )

    def test_ignores_unrecognised_files(self):
        self._add_archive("20260101T000000Z")
        (ArchiveStore.dir() / "stray.txt").write_text("not an archive")
        pruned = ArchiveStore.prune(0)
        # Stray file is left alone; only the matching archive is pruned.
        self.assertEqual(len(pruned), 1)
        self.assertTrue((ArchiveStore.dir() / "stray.txt").exists())
