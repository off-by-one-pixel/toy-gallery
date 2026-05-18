"""Archives directory layout and operations: filename conventions and
retention pruning.
"""

from __future__ import annotations

import re
from pathlib import Path

from . import gate_state_dir


class ArchiveStore:
    """Methods are classmethods — the store is a namespace, not a value with
    state. Directory location is derived at call time from the live DB's
    parent.
    """

    NAME_RE = re.compile(
        r"^(?P<ts>\d{8}T\d{6}Z)-(?P<head>[^-]+)-(?P<counter>\d+)\.(?P<ext>[a-z0-9]+)$"
    )

    @classmethod
    def dir(cls) -> Path:
        return gate_state_dir() / "archives"

    @classmethod
    def filename(cls, ts: str, head: str, counter: int, engine_ext: str) -> str:
        return f"{ts}-{head}-{counter}.{engine_ext}"

    @classmethod
    def next_counter(cls, ts: str, head: str, engine_ext: str) -> int:
        """Next counter for archives sharing the same (ts, head, ext) — guards
        against filename collisions when two archives land in the same second.
        """
        ad = cls.dir()
        if not ad.exists():
            return 1
        max_counter = 0
        for entry in ad.iterdir():
            match = cls.NAME_RE.match(entry.name)
            if not match:
                continue
            if (
                match.group("ts") != ts
                or match.group("head") != head
                or match.group("ext") != engine_ext
            ):
                continue
            max_counter = max(max_counter, int(match.group("counter")))
        return max_counter + 1

    @classmethod
    def prune(cls, retain: int) -> list[Path]:
        """Keep the `retain` most recent archives by filename timestamp."""
        ad = cls.dir()
        if not ad.exists():
            return []
        archives = [p for p in ad.iterdir() if cls.NAME_RE.match(p.name)]
        archives.sort(key=lambda p: p.name, reverse=True)
        pruned: list[Path] = []
        for victim in archives[retain:]:
            victim.unlink(missing_ok=True)
            pruned.append(victim)
        return pruned
