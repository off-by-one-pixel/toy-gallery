'use client';

import { useEffect } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { fetchSessionMedia } from '@/api';
import { queryKeys } from '@/api/queryKeys';
import type { SessionMedia } from '@/api/types';
import { useMediaStatus } from '@/features/sessions/media/useMediaStatus';
import { useApiQuery } from '@/hooks/useApi';

export interface SessionMediaState {
  configured: boolean;
  media: SessionMedia | undefined;
  isPending: boolean;
  isError: boolean;
}

export function useSessionMedia(sessionId: number): SessionMediaState {
  const queryClient = useQueryClient();
  const { configured } = useMediaStatus();
  const {
    data: media,
    isPending,
    isError,
  } = useApiQuery({
    key: queryKeys.media.session(sessionId),
    fn: () => fetchSessionMedia(sessionId),
    enabled: configured,
  });

  useEffect(() => {
    if (!media?.configured) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.detail(sessionId) });
  }, [media, queryClient, sessionId]);

  return { configured, media, isPending, isError };
}
