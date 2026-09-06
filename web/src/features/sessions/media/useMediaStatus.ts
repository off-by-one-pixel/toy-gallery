'use client';

import { fetchMediaStatus } from '@/api';
import { queryKeys } from '@/api/queryKeys';
import { useApiQuery } from '@/hooks/useApi';

export function useMediaStatus(): Readonly<{ configured: boolean }> {
  const { data } = useApiQuery({
    key: queryKeys.media.status,
    fn: fetchMediaStatus,
    staleTime: 300_000,
  });
  return { configured: data?.configured === true };
}
