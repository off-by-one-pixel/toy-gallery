from datetime import timedelta

from django.test import SimpleTestCase

from . import models
from .challenges import (
    DEPTH,
    GIRTH,
    NEAR_RECORD,
    NEW_TOY,
    OLD_TOY,
    RECENT_USE,
    RECORD_KEYS,
    TIME,
    Challenge,
    ToyUsage,
    find_challenges,
    old_toy_points,
    sort_challenges,
    step_points,
)
from .records import SESSION_RECORD_DEFINITIONS, TOY_RECORD_DEFINITIONS
from .records.session import resync_records
from .testutils import ApiTestBase, utc

NOW = utc("2026-06-30T12:00:00")
LONG_AGO = 100


class StepPointsTests(SimpleTestCase):
    def test_bands(self):
        cases = [(0.01, 5), (0.025, 5), (0.03, 3), (0.05, 3), (0.07, 1), (0.10, 1), (0.11, None)]
        for step, points in cases:
            with self.subTest(step=step):
                self.assertEqual(step_points(step), points)


class OldToyPointsTests(SimpleTestCase):
    def test_bands(self):
        cases = [(0, 0), (1, 2), (4, 2), (5, 3), (19, 3), (20, 4), (99, 4), (100, 5), (250, 5)]
        for count, points in cases:
            with self.subTest(count=count):
                self.assertEqual(old_toy_points(count), points)


class RecordKeysTests(SimpleTestCase):
    def test_each_record_key_is_a_registered_record(self):
        registered = SESSION_RECORD_DEFINITIONS.keys() | TOY_RECORD_DEFINITIONS.keys()
        self.assertLessEqual(set(RECORD_KEYS.values()), registered)


def _challenge(kind, name, points, step=0.0, toy_id=1):
    toy = ToyUsage(toy_id, name, None, None, 0, None, None)
    return Challenge(kind, toy, points, step=step)


def _order(found):
    return [(c.kind, c.toy.name) for c in sort_challenges(found)]


class SortChallengesTests(SimpleTestCase):
    def test_more_points_come_first(self):
        found = [_challenge(TIME, "a", 2), _challenge(GIRTH, "b", 8), _challenge(OLD_TOY, "c", 5)]
        self.assertEqual(_order(found), [(GIRTH, "b"), (OLD_TOY, "c"), (TIME, "a")])

    def test_equal_points_follow_the_kind_order(self):
        found = [_challenge(kind, "a", 3) for kind in [TIME, OLD_TOY, DEPTH, GIRTH, NEW_TOY]]
        kinds = [kind for kind, _ in _order(found)]
        self.assertEqual(kinds, [NEW_TOY, GIRTH, DEPTH, OLD_TOY, TIME])

    def test_equal_kind_puts_the_smaller_step_first(self):
        found = [_challenge(GIRTH, "a", 3, step=0.05), _challenge(GIRTH, "b", 3, step=0.04)]
        self.assertEqual(_order(found), [(GIRTH, "b"), (GIRTH, "a")])

    def test_equal_step_sorts_by_toy_name_ignoring_case(self):
        found = [_challenge(TIME, "beta", 3, toy_id=1), _challenge(TIME, "Alpha", 3, toy_id=2)]
        self.assertEqual(_order(found), [(TIME, "Alpha"), (TIME, "beta")])


class ChallengeTestBase(ApiTestBase):
    def _toy(self, name, **fields):
        return self._create_toy(name, **fields)

    def _use(self, toy, days_ago=LONG_AGO, involvement="USED", duration=None, **fields):
        entry = {"toy": toy, "involvement": involvement, "duration_minutes": duration}
        return self._make_session(NOW - timedelta(days=days_ago), [entry], **fields)

    def _found(self, kind):
        resync_records()
        return {c.toy.id: c for c in find_challenges(NOW) if c.kind == kind}


class NewToyChallengeTests(ChallengeTestBase):
    def test_a_toy_without_sessions_gets_ten_points(self):
        toy = self._toy("A")
        challenge = self._found(NEW_TOY)[toy]
        self.assertEqual(challenge.points, 10)
        self.assertEqual(challenge.reasons, ())

    def test_a_used_toy_is_not_new(self):
        toy = self._toy("A")
        self._use(toy)
        self.assertNotIn(toy, self._found(NEW_TOY))

    def test_a_toy_only_in_the_live_session_is_still_new(self):
        toy = self._toy("A")
        self._use(toy, days_ago=0, is_live=True)
        self.assertIn(toy, self._found(NEW_TOY))

    def test_a_retired_toy_has_no_challenge(self):
        self._toy("A", retired=True)
        self.assertEqual(self._found(NEW_TOY), {})


class GirthChallengeTests(ChallengeTestBase):
    def setUp(self):
        super().setUp()
        self.record_toy = self._toy("Record", circumference=200.0)
        self._use(self.record_toy, involvement="INSERTED")

    def test_points_follow_the_step_above_the_record(self):
        steps = {"2%": 204.0, "5%": 210.0, "7.5%": 215.0, "15%": 230.0, "smaller": 190.0}
        toys = {label: self._toy(label, circumference=size) for label, size in steps.items()}
        found = self._found(GIRTH)
        points = {label: found[toy].points if toy in found else None for label, toy in toys.items()}
        self.assertEqual(points, {"2%": 5, "5%": 3, "7.5%": 1, "15%": None, "smaller": None})

    def test_the_challenge_names_the_target_and_the_record(self):
        toy = self._toy("Next", circumference=210.0)
        challenge = self._found(GIRTH)[toy]
        self.assertEqual((challenge.target, challenge.best), (210.0, 200.0))

    def test_a_recently_used_candidate_gets_three_more_points(self):
        toy = self._toy("Next", circumference=204.0)
        self._use(toy, days_ago=3)
        challenge = self._found(GIRTH)[toy]
        self.assertEqual((challenge.points, challenge.reasons), (8, (RECENT_USE,)))

    def test_a_use_older_than_fourteen_days_is_not_recent(self):
        toy = self._toy("Next", circumference=204.0)
        self._use(toy, days_ago=15)
        self.assertEqual(self._found(GIRTH)[toy].points, 5)

    def test_a_used_only_entry_does_not_raise_the_record(self):
        self._use(self._toy("Bigger", circumference=209.0))
        toy = self._toy("Next", circumference=210.0)
        self.assertEqual(self._found(GIRTH)[toy].best, 200.0)

    def test_the_live_session_does_not_raise_the_record(self):
        self._use(self._toy("Bigger", circumference=209.0), 0, "INSERTED", is_live=True)
        toy = self._toy("Next", circumference=210.0)
        self.assertEqual(self._found(GIRTH)[toy].best, 200.0)

    def test_a_retired_toy_sets_the_record_but_is_never_a_candidate(self):
        retired = self._toy("Retired", circumference=204.0, retired=True)
        self._use(retired, involvement="INSERTED")
        candidate = self._toy("Next", circumference=206.0)
        retired_candidate = self._toy("Old", circumference=207.0, retired=True)
        found = self._found(GIRTH)
        self.assertEqual(found[candidate].best, 204.0)
        self.assertNotIn(retired_candidate, found)

    def test_the_record_is_the_saved_record_value(self):
        resync_records()
        models.Toy.objects.filter(pk=self.record_toy).update(circumference=205.0)
        toy = self._toy("Next", circumference=210.0)
        challenge = next(c for c in find_challenges(NOW) if c.kind == GIRTH and c.toy.id == toy)
        self.assertEqual(challenge.best, 200.0)

    def test_a_toy_without_a_circumference_is_not_a_candidate(self):
        toy = self._toy("Unknown", circumference=None)
        self.assertNotIn(toy, self._found(GIRTH))


class GirthWithoutRecordTests(ChallengeTestBase):
    def test_no_insertion_means_no_girth_challenges(self):
        self._use(self._toy("A", circumference=200.0))
        self._toy("B", circumference=204.0)
        self.assertEqual(self._found(GIRTH), {})


class DepthChallengeTests(ChallengeTestBase):
    def test_only_a_full_insertion_sets_the_record(self):
        self._use(self._toy("Deep", insertable_length=300.0), involvement="INSERTED")
        self._use(self._toy("Record", insertable_length=200.0), involvement="FULLY_INSERTED")
        toy = self._toy("Next", insertable_length=204.0)
        challenge = self._found(DEPTH)[toy]
        self.assertEqual((challenge.points, challenge.target, challenge.best), (5, 204.0, 200.0))

    def test_a_step_above_ten_percent_has_no_challenge(self):
        self._use(self._toy("Record", insertable_length=200.0), involvement="FULLY_INSERTED")
        toy = self._toy("Far", insertable_length=221.0)
        self.assertNotIn(toy, self._found(DEPTH))


class OldToyChallengeTests(ChallengeTestBase):
    def test_points_follow_the_earlier_session_count(self):
        toy = self._toy("A")
        for days_ago in range(61, 66):
            self._use(toy, days_ago=days_ago)
        challenge = self._found(OLD_TOY)[toy]
        self.assertEqual((challenge.points, challenge.reasons), (3, ()))

    def test_a_use_in_the_last_sixty_days_is_not_old(self):
        toy = self._toy("A")
        self._use(toy, days_ago=59)
        self.assertNotIn(toy, self._found(OLD_TOY))

    def test_a_toy_without_sessions_is_not_old(self):
        toy = self._toy("A")
        self.assertNotIn(toy, self._found(OLD_TOY))


class TimeChallengeTests(ChallengeTestBase):
    def test_a_toy_without_a_logged_time_asks_for_one(self):
        toy = self._toy("A")
        self._use(toy, days_ago=2)
        challenge = self._found(TIME)[toy]
        self.assertEqual(
            (challenge.points, challenge.target, challenge.best, challenge.reasons),
            (3, None, None, (RECENT_USE,)),
        )

    def test_the_target_is_one_minute_above_the_record(self):
        toy = self._toy("A")
        self._use(toy, duration=30)
        self._use(toy, duration=10, days_ago=LONG_AGO + 1)
        challenge = self._found(TIME)[toy]
        self.assertEqual((challenge.target, challenge.best, challenge.points), (31, 30, 0))

    def test_an_average_near_the_record_gets_two_points(self):
        toy = self._toy("A")
        self._use(toy, duration=30)
        self._use(toy, duration=20, days_ago=LONG_AGO + 1)
        challenge = self._found(TIME)[toy]
        self.assertEqual((challenge.points, challenge.reasons), (2, (NEAR_RECORD,)))

    def test_recent_use_and_a_near_average_add_up(self):
        toy = self._toy("A")
        self._use(toy, days_ago=1, duration=30)
        self.assertEqual(self._found(TIME)[toy].points, 5)

    def test_the_live_session_does_not_change_the_record(self):
        toy = self._toy("A")
        self._use(toy, duration=30)
        self._use(toy, days_ago=0, duration=90, is_live=True)
        self.assertEqual(self._found(TIME)[toy].best, 30)

    def test_a_toy_without_sessions_has_no_time_challenge(self):
        toy = self._toy("A")
        self.assertNotIn(toy, self._found(TIME))


class ChallengeEndpointTests(ApiTestBase):
    def test_lists_the_challenges(self):
        toy = self._create_toy("A")
        response = self.client.get("/toys/toys/challenges/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data,
            [
                {
                    "kind": NEW_TOY,
                    "toy": toy,
                    "points": 10,
                    "target": None,
                    "best": None,
                    "reasons": [],
                    "session_count": 0,
                    "last_used_at": None,
                    "average_minutes": None,
                }
            ],
        )
