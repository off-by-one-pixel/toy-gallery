'use client';

import { memo, useEffect, useMemo } from 'react';
import { keepPreviousData, useQueries } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';

import { useReportError } from '@/hooks/useApi';
import { useGirth } from '@/features/preferences/useGirth';
import { useUnit } from '@/features/preferences/useUnit';
import { fetchSessionStats } from '@/api';
import { queryKeys } from '@/api/queryKeys';
import type { Period, SessionFilters } from '@/features/sessions/session';
import { SESSION_STATS } from '@/features/sessions/stats/statsConfig';
import {
  buildStatViews,
  deriveQueries,
  type StatContext,
  type StatDef,
  rangeFor,
} from '@/features/sessions/stats/statsView';
import type { StatsGroup } from '@/api/types';
import ActivityTracker from '@/features/sessions/stats/ActivityTracker';

type Props = Readonly<{ period: Period; sessionFilters: SessionFilters; defs?: readonly StatDef[] }>;

function SessionStats({ period, sessionFilters, defs = SESSION_STATS }: Props) {
  const { unit } = useUnit();
  const { girth } = useGirth();
  const locale = useLocale();
  const t = useTranslations();
  const reportError = useReportError();

  const queries = useMemo(() => deriveQueries(defs), [defs]);

  const { results, yearReady, error } = useQueries({
    queries: queries.map((query) => {
      const range = rangeFor(query.window, period);
      return {
        queryKey: queryKeys.sessions.stat(query.groupBy, query.metrics, range, sessionFilters),
        queryFn: () => fetchSessionStats(query.groupBy, query.metrics, { ...range, filters: sessionFilters }),
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

  const ctx = useMemo<StatContext>(() => ({ unit, girth, locale, t }), [unit, girth, locale, t]);

  const items = useMemo(() => (yearReady ? buildStatViews(defs, results, ctx) : []), [yearReady, defs, results, ctx]);

  if (!yearReady) return null;

  return (
    <div className="mb-4">
      <ActivityTracker items={items} />
    </div>
  );
}

export default memo(SessionStats);
