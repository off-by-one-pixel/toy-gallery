'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useGirth } from '../../providers/GirthProvider';
import { fetchActivity, fetchToys, fetchSessions } from '../../services/api';
import { type ActivityHeatmap, buildActivityHeatmap } from '../../services/activity';
import { type FilterKey, filterSessions, toysById as buildToysById } from '../../services/session';
import type { ActivityDay, Session, Toy } from '../../services/types';
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
  const [activity, setActivity] = useState<ActivityDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [loadCount, setLoadCount] = useState(0);

  const runInline = useAsyncAction(setError);

  useEffect(() => {
    let cancelled = false;
    runInline(
      async () => {
        const [s, t, a] = await Promise.all([fetchSessions(), fetchToys(), fetchActivity()]);
        return { sessions: s, toys: t, activity: a };
      },
      {
        busy: setIsLoading,
        onSuccess: (loaded) => {
          if (cancelled) return;
          setSessions(loaded.sessions);
          setToys(loaded.toys);
          setActivity(loaded.activity);
          setError(null);
        },
      },
    );
    return () => {
      cancelled = true;
    };
  }, [runInline, loadCount]);

  const heatmap = useMemo(
    () =>
      buildActivityHeatmap(
        activity,
        unit,
        locale,
        { length: t('length'), circumference: t(girth), sessions: tSession('perDayTitle') },
        { girth },
      ),
    [activity, unit, locale, t, tSession, girth],
  );
  const toysById = useMemo(() => buildToysById(toys), [toys]);
  const visibleSessions = useMemo(() => filterSessions(sessions, filter), [sessions, filter]);

  return {
    sessionCount: sessions.length,
    visibleSessions,
    toysById,
    heatmap,
    reload: () => setLoadCount((n) => n + 1),
    filter,
    setFilter,
    isLoading,
    error,
  };
}
