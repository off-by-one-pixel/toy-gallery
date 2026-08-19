'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useGirth } from '../../providers/GirthProvider';
import { useUnit } from '../../providers/UnitProvider';
import { fetchSessionStats, SESSIONS_CHANGED_EVENT } from '../../services/api';
import type { FilterKey } from '../../services/session';
import { SESSION_STATS } from '../../services/statsConfig';
import {
  buildStatViews,
  deriveQueries,
  type StatContext,
  type StatDef,
  startFor,
  type StatWindow,
} from '../../services/statsView';
import type { StatsGroup } from '../../services/types';
import ActivityTracker from '../ActivityTracker';

type Props = Readonly<{ filter: FilterKey; defs?: readonly StatDef[] }>;

function useSessionsChangedVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((n) => n + 1);
    window.addEventListener(SESSIONS_CHANGED_EVENT, bump);
    return () => window.removeEventListener(SESSIONS_CHANGED_EVENT, bump);
  }, []);
  return version;
}

export default function SessionStats({ filter, defs = SESSION_STATS }: Props) {
  const { unit } = useUnit();
  const { girth } = useGirth();
  const locale = useLocale();
  const t = useTranslations();
  const version = useSessionsChangedVersion();
  const run = useAsyncAction();
  const [results, setResults] = useState<Map<string, StatsGroup[]>>(() => new Map());

  const queries = useMemo(() => deriveQueries(defs), [defs]);

  const runWindow = useCallback(
    (window: StatWindow, filterKey: FilterKey, isCancelled: () => boolean) => {
      const selected = queries.filter((query) => query.window === window);
      if (selected.length === 0) return;
      run(
        async () => {
          const groups = await Promise.all(
            selected.map((query) =>
              fetchSessionStats(query.groupBy, query.metrics, { start: startFor(window, filterKey) }),
            ),
          );
          return selected.map((query, i) => [query.key, groups[i]] as const);
        },
        {
          onSuccess: (entries) => {
            if (isCancelled()) return;
            setResults((prev) => {
              const next = new Map(prev);
              for (const [key, groups] of entries) next.set(key, groups);
              return next;
            });
          },
        },
      );
    },
    [queries, run],
  );

  useEffect(() => {
    let cancelled = false;
    runWindow('year', filter, () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [runWindow, version]);

  useEffect(() => {
    let cancelled = false;
    runWindow('filter', filter, () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [runWindow, filter, version]);

  const translate = t as unknown as StatContext['t'];
  const ctx = useMemo<StatContext>(() => ({ unit, girth, locale, t: translate }), [unit, girth, locale, translate]);

  const yearReady = queries.filter((query) => query.window === 'year').every((query) => results.has(query.key));

  const items = useMemo(() => (yearReady ? buildStatViews(defs, results, ctx) : []), [yearReady, defs, results, ctx]);

  if (!yearReady) return null;

  return (
    <div className="mb-4">
      <ActivityTracker items={items} />
    </div>
  );
}
