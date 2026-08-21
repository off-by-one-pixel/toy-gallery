'use client';

import { useEffect, useMemo } from 'react';
import { keepPreviousData, useQueries } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';

import { useReportError } from '@/hooks/useAsyncAction';
import { useGirth } from '@/providers/GirthProvider';
import { useUnit } from '@/providers/UnitProvider';
import { fetchSessionStats } from '@/api';
import { queryKeys } from '@/api/queryKeys';
import type { FilterKey } from '@/features/sessions/session';
import { SESSION_STATS } from '@/features/sessions/stats/statsConfig';
import {
  buildStatViews,
  deriveQueries,
  type StatContext,
  type StatDef,
  startFor,
} from '@/features/sessions/stats/statsView';
import type { StatsGroup } from '@/api/types';
import ActivityTracker from '@/features/sessions/stats/ActivityTracker';

type Props = Readonly<{ filter: FilterKey; defs?: readonly StatDef[] }>;

export default function SessionStats({ filter, defs = SESSION_STATS }: Props) {
  const { unit } = useUnit();
  const { girth } = useGirth();
  const locale = useLocale();
  const t = useTranslations();
  const reportError = useReportError();

  const queries = useMemo(() => deriveQueries(defs), [defs]);

  const { results, yearReady, error } = useQueries({
    queries: queries.map((query) => {
      const start = startFor(query.window, filter);
      return {
        queryKey: queryKeys.sessions.stat(query.groupBy, query.metrics, start),
        queryFn: () => fetchSessionStats(query.groupBy, query.metrics, { start }),
        placeholderData: keepPreviousData,
      };
    }),
    combine: (states) => {
      const combined = new Map<string, StatsGroup[]>();
      queries.forEach((query, i) => {
        const data = states[i]?.data;
        if (data) combined.set(query.key, data);
      });
      return {
        results: combined,
        yearReady: queries.every((query, i) => query.window !== 'year' || states[i]?.data !== undefined),
        error: states.find((state) => state.error)?.error ?? null,
      };
    },
  });

  useEffect(() => {
    if (error) reportError(error);
  }, [error, reportError]);

  const translate = t as unknown as StatContext['t'];
  const ctx = useMemo<StatContext>(() => ({ unit, girth, locale, t: translate }), [unit, girth, locale, translate]);

  const items = useMemo(() => (yearReady ? buildStatViews(defs, results, ctx) : []), [yearReady, defs, results, ctx]);

  if (!yearReady) return null;

  return (
    <div className="mb-4">
      <ActivityTracker items={items} />
    </div>
  );
}
