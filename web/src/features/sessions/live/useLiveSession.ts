'use client';

import { useEffect, useRef } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { fetchLiveSession, startLiveSession } from '@/api';
import { invalidateSessionHistory, queryKeys } from '@/api/queryKeys';
import { useApiQuery } from '@/hooks/useApi';
import type { Session } from '@/api/types';

export const LIVE_SYNC_INTERVAL_MS = 2_000;

export interface LiveSessionState {
  liveSession: Session | null;
  isLoaded: boolean;
  start: () => Promise<Session>;
}

export function useLiveSession(): LiveSessionState {
  const queryClient = useQueryClient();
  const { data, isFetched } = useApiQuery({
    key: queryKeys.sessions.live,
    fn: fetchLiveSession,
    refetchInterval: LIVE_SYNC_INTERVAL_MS,
    refetchOnWindowFocus: 'always',
  });

  const start = async () => {
    const session = await startLiveSession();
    queryClient.setQueryData(queryKeys.sessions.live, session);
    return session;
  };

  return { liveSession: data ?? null, isLoaded: isFetched, start };
}

export function useLiveSessionSync(): void {
  const queryClient = useQueryClient();
  const { liveSession, isLoaded } = useLiveSession();
  const liveId = liveSession?.id ?? null;
  const previousIdRef = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    if (!isLoaded) return;
    if (previousIdRef.current === undefined) {
      previousIdRef.current = liveId;
      return;
    }
    if (previousIdRef.current === liveId) return;
    previousIdRef.current = liveId;
    invalidateSessionHistory(queryClient);
  }, [queryClient, isLoaded, liveId]);
}
