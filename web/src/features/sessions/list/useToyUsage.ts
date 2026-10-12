'use client';

import { useMemo } from 'react';

import { fetchSessionStats } from '@/api';
import { queryKeys } from '@/api/queryKeys';
import { type Period, periodRange } from '@/features/sessions/session';
import { useApiQuery } from '@/hooks/useApi';

export function useToyUsage(period: Period): Map<number, number> {
  const range = periodRange(period);
  const { data } = useApiQuery({
    key: queryKeys.sessions.stat('toy', ['count'], range, null),
    fn: () => fetchSessionStats('toy', ['count'], range),
  });
  return useMemo(() => new Map((data ?? []).map((group) => [Number(group.key), group.values.count ?? 0])), [data]);
}
