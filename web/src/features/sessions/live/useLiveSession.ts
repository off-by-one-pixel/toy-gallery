'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchLiveSession, startLiveSession } from '@/api';
import { queryKeys } from '@/api/queryKeys';
import type { Session } from '@/api/types';

export interface LiveSessionState {
  liveSession: Session | null;
  isLoaded: boolean;
  start: () => Promise<Session>;
}

export function useLiveSession(): LiveSessionState {
  const queryClient = useQueryClient();
  const { data, isFetched } = useQuery({ queryKey: queryKeys.sessions.live, queryFn: fetchLiveSession });

  const start = async () => {
    const session = await startLiveSession();
    queryClient.setQueryData(queryKeys.sessions.live, session);
    void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.lists });
    void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.stats });
    return session;
  };

  return { liveSession: data ?? null, isLoaded: isFetched, start };
}
