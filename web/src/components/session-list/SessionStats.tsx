'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useGirth } from '../../providers/GirthProvider';
import { useUnit } from '../../providers/UnitProvider';
import { ACTIVITY_WINDOW_DAYS, buildActivityHeatmap } from '../../services/activity';
import { fetchSessionStats, SESSIONS_CHANGED_EVENT } from '../../services/api';
import { type FilterKey, filterStartDate } from '../../services/session';
import {
  activityDaysFromStats,
  countsFromGroups,
  daysAgoDateString,
  METRIC_COUNT,
  METRIC_MAX_CIRCUMFERENCE,
  METRIC_MAX_LENGTH,
} from '../../services/stats';
import type { StatsGroup } from '../../services/types';
import ActivityTracker from '../ActivityTracker';

type Props = Readonly<{ filter: FilterKey }>;

function useSessionsChangedVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((n) => n + 1);
    window.addEventListener(SESSIONS_CHANGED_EVENT, bump);
    return () => window.removeEventListener(SESSIONS_CHANGED_EVENT, bump);
  }, []);
  return version;
}

export default function SessionStats({ filter }: Props) {
  const { unit } = useUnit();
  const { girth } = useGirth();
  const locale = useLocale();
  const t = useTranslations('common');
  const tSession = useTranslations('session');
  const version = useSessionsChangedVersion();
  const run = useAsyncAction();
  const [dateGroups, setDateGroups] = useState<StatsGroup[] | null>(null);
  const [hourCounts, setHourCounts] = useState<number[]>(() => Array.from({ length: 24 }, () => 0));
  const [weekdayCounts, setWeekdayCounts] = useState<number[]>(() => Array.from({ length: 7 }, () => 0));

  useEffect(() => {
    let cancelled = false;
    run(
      () =>
        fetchSessionStats('date', [METRIC_COUNT, METRIC_MAX_LENGTH, METRIC_MAX_CIRCUMFERENCE], {
          start: daysAgoDateString(ACTIVITY_WINDOW_DAYS - 1),
        }),
      {
        onSuccess: (groups) => {
          if (!cancelled) setDateGroups(groups);
        },
      },
    );
    return () => {
      cancelled = true;
    };
  }, [run, version]);

  useEffect(() => {
    let cancelled = false;
    const start = filterStartDate(filter);
    run(
      async () => {
        const [hours, weekdays] = await Promise.all([
          fetchSessionStats('hour', [METRIC_COUNT], { start }),
          fetchSessionStats('weekday', [METRIC_COUNT], { start }),
        ]);
        return { hours, weekdays };
      },
      {
        onSuccess: (loaded) => {
          if (cancelled) return;
          setHourCounts(countsFromGroups(loaded.hours, 24));
          setWeekdayCounts(countsFromGroups(loaded.weekdays, 7));
        },
      },
    );
    return () => {
      cancelled = true;
    };
  }, [run, filter, version]);

  const heatmap = useMemo(
    () =>
      dateGroups === null
        ? null
        : buildActivityHeatmap(
            activityDaysFromStats(dateGroups),
            unit,
            locale,
            { length: t('length'), circumference: t(girth), sessions: tSession('perDayTitle') },
            { girth },
          ),
    [dateGroups, unit, locale, t, tSession, girth],
  );

  if (heatmap === null) return null;

  return (
    <div className="mb-4">
      <ActivityTracker heatmap={heatmap} hourCounts={hourCounts} weekdayCounts={weekdayCounts} />
    </div>
  );
}
