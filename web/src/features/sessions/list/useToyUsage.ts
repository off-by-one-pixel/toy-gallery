'use client';

import { useMemo } from 'react';

import { fetchSessionStats } from '@/api';
import { queryKeys } from '@/api/queryKeys';
import { type FilterKey, filterStartDate } from '@/features/sessions/session';
import { useApiQuery } from '@/hooks/useApi';

export function useToyUsage(filter: FilterKey): Map<number, number> {
  const start = filterStartDate(filter);
  const { data } = useApiQuery({
    key: queryKeys.sessions.stat('toy', ['count'], start, ''),
    fn: () => fetchSessionStats('toy', ['count'], { start }),
  });
  return useMemo(() => new Map((data ?? []).map((group) => [Number(group.key), group.values.count ?? 0])), [data]);
}
