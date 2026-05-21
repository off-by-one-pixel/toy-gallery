"""Tests for the pure helpers in toys.dimensions."""

from __future__ import annotations

from django.test import SimpleTestCase

from toys.dimensions import max_or_none


class MaxOrNoneTests(SimpleTestCase):
    def test_returns_max_of_non_none(self):
        self.assertEqual(max_or_none([1, 3, 2]), 3)

    def test_skips_nones(self):
        self.assertEqual(max_or_none([None, 5, None, 2]), 5)

    def test_returns_none_when_all_none(self):
        self.assertIsNone(max_or_none([None, None]))

    def test_returns_none_when_empty(self):
        self.assertIsNone(max_or_none([]))
