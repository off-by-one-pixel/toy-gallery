from __future__ import annotations

from datetime import UTC, datetime

from django.test import SimpleTestCase, TestCase

from toys import models
from toys.dimensions import SessionDimensions, max_entry_or_none, value_or_none


class FakeEntry:
    def __init__(self, value):
        self.value = value


def by_value(entry):
    return entry.value


class MaxEntryOrNoneTests(SimpleTestCase):
    def test_returns_entry_with_max_value_and_the_value(self):
        entries = [FakeEntry(1.0), FakeEntry(3.0), FakeEntry(2.0)]
        self.assertEqual(max_entry_or_none(entries, by_value), (entries[1], 3.0))

    def test_skips_entries_whose_value_is_none(self):
        entries = [FakeEntry(None), FakeEntry(5.0), FakeEntry(None), FakeEntry(2.0)]
        self.assertEqual(max_entry_or_none(entries, by_value), (entries[1], 5.0))

    def test_returns_none_when_all_values_are_none(self):
        self.assertIsNone(max_entry_or_none([FakeEntry(None), FakeEntry(None)], by_value))

    def test_returns_none_when_empty(self):
        self.assertIsNone(max_entry_or_none([], by_value))


class ValueOrNoneTests(SimpleTestCase):
    def test_unwraps_the_value(self):
        self.assertEqual(value_or_none((object(), 42.0)), 42.0)

    def test_passes_none_through(self):
        self.assertIsNone(value_or_none(None))


class SessionPeaksTests(TestCase):
    def _toy(self, name, *, circumference=None, insertable_length=None):
        shape = models.Shape.objects.create()
        return models.Toy.objects.create(
            brand="Acme",
            name=name,
            size="M",
            shape=shape,
            circumference=circumference,
            insertable_length=insertable_length,
        )

    def _session(self, entries):
        session = models.Session.objects.create(
            started_at=datetime(2026, 6, 1, 10, 0, tzinfo=UTC)
        )
        for toy, involvement in entries:
            models.ToySessionEntry.objects.create(
                session=session, toy=toy, involvement=involvement
            )
        return session

    def _assert_peak(self, result, toy, value):
        self.assertIsNotNone(result)
        entry, peak = result
        self.assertEqual(entry.toy_id, toy.id)
        self.assertEqual(peak, value)

    def test_fully_inserted_entry_yields_entry_and_value(self):
        toy = self._toy("A", circumference=220.0, insertable_length=170.0)
        session = self._session([(toy, "FULLY_INSERTED")])
        self._assert_peak(SessionDimensions.peak_length_with_entry(session), toy, 170.0)
        self._assert_peak(SessionDimensions.peak_circumference_with_entry(session), toy, 220.0)

    def test_plain_peaks_still_return_bare_values(self):
        toy = self._toy("A", circumference=220.0, insertable_length=170.0)
        session = self._session([(toy, "FULLY_INSERTED")])
        self.assertEqual(SessionDimensions.peak_length(session), 170.0)
        self.assertEqual(SessionDimensions.peak_circumference(session), 220.0)

    def test_inserted_contributes_circumference_only(self):
        toy = self._toy("A", circumference=220.0, insertable_length=170.0)
        session = self._session([(toy, "INSERTED")])
        self.assertIsNone(SessionDimensions.peak_length_with_entry(session))
        self._assert_peak(SessionDimensions.peak_circumference_with_entry(session), toy, 220.0)

    def test_used_contributes_nothing(self):
        toy = self._toy("A", circumference=220.0, insertable_length=170.0)
        session = self._session([(toy, "USED")])
        self.assertIsNone(SessionDimensions.peak_length_with_entry(session))
        self.assertIsNone(SessionDimensions.peak_circumference_with_entry(session))
        self.assertIsNone(SessionDimensions.peak_length(session))
        self.assertIsNone(SessionDimensions.peak_circumference(session))

    def test_peaks_attribute_the_owning_entry_independently(self):
        girthy = self._toy("Girthy", circumference=240.0, insertable_length=150.0)
        long = self._toy("Long", circumference=200.0, insertable_length=190.0)
        session = self._session([(girthy, "FULLY_INSERTED"), (long, "FULLY_INSERTED")])
        self._assert_peak(SessionDimensions.peak_length_with_entry(session), long, 190.0)
        self._assert_peak(SessionDimensions.peak_circumference_with_entry(session), girthy, 240.0)

    def test_peak_ignores_non_qualifying_entry_with_bigger_value(self):
        used = self._toy("Used", circumference=260.0, insertable_length=200.0)
        inserted = self._toy("Inserted", circumference=220.0, insertable_length=170.0)
        session = self._session([(used, "USED"), (inserted, "INSERTED")])
        self._assert_peak(SessionDimensions.peak_circumference_with_entry(session), inserted, 220.0)
        self.assertIsNone(SessionDimensions.peak_length_with_entry(session))

    def test_null_dimensions_are_skipped(self):
        bare = self._toy("Bare")
        measured = self._toy("Measured", circumference=220.0, insertable_length=170.0)
        session = self._session([(bare, "FULLY_INSERTED"), (measured, "FULLY_INSERTED")])
        self._assert_peak(SessionDimensions.peak_length_with_entry(session), measured, 170.0)
        self._assert_peak(SessionDimensions.peak_circumference_with_entry(session), measured, 220.0)

    def test_no_entries_yields_none(self):
        session = self._session([])
        self.assertIsNone(SessionDimensions.peak_length_with_entry(session))
        self.assertIsNone(SessionDimensions.peak_circumference_with_entry(session))
