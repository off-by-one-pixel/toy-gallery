"""Invariants checked by the migration safety gate against the candidate DB.

The gate (toys.management.commands.safe_migrate) imports this module and
calls ``check()`` after migrations apply but before promotion. Any raise
aborts the promotion; the live DB is left untouched.

Add new invariants by appending a function to ``_INVARIANTS``. Each runs
against current Django models — typically to validate a data migration's
post-state.
"""

from __future__ import annotations

from toys.models import Toy


def check() -> None:
    failures: list[str] = []
    for invariant in _INVARIANTS:
        try:
            invariant()
        except AssertionError as err:
            failures.append(f"{invariant.__name__}: {err}")
    if failures:
        raise AssertionError("\n".join(failures))


def toy_with_section_circumferences_has_aggregate() -> None:
    """Migration toys.0014 backfilled ``Toy.circumference`` from
    ``max(section.circumference)``. Any toy whose shape has at least one
    section with a non-null circumference must also have its own
    ``circumference`` populated.
    """
    violators = list(
        Toy.objects.filter(
            circumference__isnull=True,
            shape__sections__circumference__isnull=False,
        )
        .distinct()
        .values_list("id", flat=True)[:10]
    )
    if violators:
        raise AssertionError(
            f"toy id(s) {violators}: section.circumference set but toy.circumference is null"
        )


_INVARIANTS = [toy_with_section_circumferences_has_aggregate]
