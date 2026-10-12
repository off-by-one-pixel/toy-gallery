'use client';

import { useLocale } from 'next-intl';

import { useNow } from '@/hooks/useNow';
import { formatDuration, secondsBetween } from '@/lib/duration';

export function useLiveElapsed(startedAt: string | null) {
  const locale = useLocale();
  const now = useNow(1000, startedAt !== null);
  const elapsed =
    startedAt === null ? null : formatDuration(secondsBetween(startedAt, now.toISOString()), locale, 'second');
  return { now, elapsed };
}
