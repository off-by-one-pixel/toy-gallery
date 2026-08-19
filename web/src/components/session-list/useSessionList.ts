'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useGirth } from '../../providers/GirthProvider';
import {
  fetchMediaIndicators,
  fetchSessionStats,
  fetchToys,
  fetchSessions,
  MEDIA_INDICATORS_CHANGED_EVENT,
  type MediaIndicators,
} from '../../services/api';
import { ACTIVITY_WINDOW_DAYS, type ActivityHeatmap, buildActivityHeatmap } from '../../services/activity';
import { type FilterKey, filterSessions, filterStartDate, toysById as buildToysById } from '../../services/session';
import {
  activityDaysFromStats,
  countsFromGroups,
  daysAgoDateString,
  METRIC_COUNT,
  METRIC_MAX_CIRCUMFERENCE,
  METRIC_MAX_LENGTH,
} from '../../services/stats';
import type { Session, StatsGroup, Toy } from '../../services/types';
import { type Unit } from '../../services/units';

export type SessionListData = Readonly<{
  /** Raw session count, used for chrome subtitle + empty-state copy. */
  sessionCount: number;
  /** Sessions after applying the current filter, ready to render. */
  visibleSessions: Session[];
  /** id → toy map for resolving entry.toy references. */
  toysById: Map<number, Toy>;
  /** Prebuilt activity heatmap for the page header. */
  heatmap: ActivityHeatmap;
  mediaSessionIds: Set<number>;
  hourCounts: number[];
  weekdayCounts: number[];
  prependSession: (session: Session) => void;
  reload: () => void;

  filter: FilterKey;
  setFilter: (next: FilterKey) => void;

  isLoading: boolean;
  error: string | null;
}>;

/** Loads sessions + toys + activity in parallel and exposes everything
 *  the SessionList page needs to render: filtered session list, toy
 *  lookup, activity heatmap, filter state. The page is a dumb
 *  composition over this facade. */
export function useSessionList(unit: Unit): SessionListData {
  const locale = useLocale();
  const t = useTranslations('common');
  const tSession = useTranslations('session');
  const { girth } = useGirth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [toys, setToys] = useState<Toy[]>([]);
  const [dateGroups, setDateGroups] = useState<StatsGroup[]>([]);
  const [hourCounts, setHourCounts] = useState<number[]>(() => Array.from({ length: 24 }, () => 0));
  const [weekdayCounts, setWeekdayCounts] = useState<number[]>(() => Array.from({ length: 7 }, () => 0));
  const [media, setMedia] = useState<MediaIndicators>(() => ({ configured: false, sessionIds: new Set() }));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [loadCount, setLoadCount] = useState(0);
  const [statsVersion, setStatsVersion] = useState(0);

  const runInline = useAsyncAction(setError);

  useEffect(() => {
    const onIndicatorsChanged = () => setLoadCount((n) => n + 1);
    window.addEventListener(MEDIA_INDICATORS_CHANGED_EVENT, onIndicatorsChanged);
    return () => window.removeEventListener(MEDIA_INDICATORS_CHANGED_EVENT, onIndicatorsChanged);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const start = filterStartDate(filter);
    runInline(
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
  }, [runInline, filter, loadCount, statsVersion]);

  useEffect(() => {
    let cancelled = false;
    runInline(
      async () => {
        const [s, t, a, m] = await Promise.all([
          fetchSessions(),
          fetchToys(),
          fetchSessionStats('date', [METRIC_COUNT, METRIC_MAX_LENGTH, METRIC_MAX_CIRCUMFERENCE], {
            start: daysAgoDateString(ACTIVITY_WINDOW_DAYS - 1),
          }),
          fetchMediaIndicators().catch((): MediaIndicators => ({ configured: false, sessionIds: new Set() })),
        ]);
        return { sessions: s, toys: t, dateGroups: a, media: m };
      },
      {
        busy: setIsLoading,
        onSuccess: (loaded) => {
          if (cancelled) return;
          setSessions(loaded.sessions);
          setToys(loaded.toys);
          setDateGroups(loaded.dateGroups);
          setMedia(loaded.media);
          setError(null);
        },
      },
    );
    return () => {
      cancelled = true;
    };
  }, [runInline, loadCount]);

  const activityDays = useMemo(() => activityDaysFromStats(dateGroups), [dateGroups]);
  const heatmap = useMemo(
    () =>
      buildActivityHeatmap(
        activityDays,
        unit,
        locale,
        { length: t('length'), circumference: t(girth), sessions: tSession('perDayTitle') },
        { girth },
      ),
    [activityDays, unit, locale, t, tSession, girth],
  );
  const toysById = useMemo(() => buildToysById(toys), [toys]);
  const visibleSessions = useMemo(() => filterSessions(sessions, filter), [sessions, filter]);

  return {
    sessionCount: sessions.length,
    visibleSessions,
    toysById,
    heatmap,
    mediaSessionIds: media.sessionIds,
    hourCounts,
    weekdayCounts,
    prependSession: (session: Session) => {
      setSessions((prev) => [session, ...prev]);
      setStatsVersion((n) => n + 1);
    },
    reload: () => setLoadCount((n) => n + 1),
    filter,
    setFilter,
    isLoading,
    error,
  };
}
