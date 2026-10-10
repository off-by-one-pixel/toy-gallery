from __future__ import annotations

from collections.abc import Callable

_INVARIANTS: list[Callable[[], None]] = []


def check() -> None:
    failures: list[str] = []
    for invariant in _INVARIANTS:
        try:
            invariant()
        except AssertionError as err:
            failures.append(f"{invariant.__name__}: {err}")
    if failures:
        raise AssertionError("\n".join(failures))
