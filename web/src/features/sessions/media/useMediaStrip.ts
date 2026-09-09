'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { fetchMediaStatus, fetchSessionMedia, setMediaLiked } from '@/api';
import { queryKeys } from '@/api/queryKeys';
import type { SessionMedia, SessionMediaItem } from '@/api/types';
import { usePrivacy } from '@/features/preferences/PrivacyProvider';
import { useMediaLightboxNav } from '@/features/sessions/media/useMediaLightboxNav';
import { useApiMutation, useApiQuery } from '@/hooks/useApi';

export function useMediaStatus(): Readonly<{ configured: boolean }> {
  const { data } = useApiQuery({
    key: queryKeys.media.status,
    fn: fetchMediaStatus,
    staleTime: 300_000,
  });
  return { configured: data?.configured === true };
}

export type MediaStripState = Readonly<{
  hidden: boolean;
  items: readonly SessionMediaItem[];
  shareUrl: string | null;
  showSkeleton: boolean;
  skeletonCount: number;
  showError: boolean;
  showEmpty: boolean;
  toggleLike: (item: SessionMediaItem) => void;
  openIndex: number | null;
  open: (index: number) => void;
  close: () => void;
}>;

export function useMediaStrip(sessionId: number, expectedCount: number): MediaStripState {
  const { hideSensitive } = usePrivacy();
  const { openIndex, open, close } = useMediaLightboxNav(sessionId);
  const { configured } = useMediaStatus();
  const queryClient = useQueryClient();

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

  const like = useApiMutation<{ assetId: string; liked: boolean }>({
    fn: ({ assetId, liked }) => setMediaLiked(assetId, liked),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: queryKeys.media.session(sessionId) }),
  });
  const toggleLike = (item: SessionMediaItem) => {
    queryClient.setQueryData<SessionMedia>(
      queryKeys.media.session(sessionId),
      (prev) =>
        prev && {
          ...prev,
          items: prev.items.map((i) => (i.id === item.id ? { ...i, liked: !i.liked } : i)),
        },
    );
    void like.run({ assetId: item.id, liked: !item.liked });
  };

  useEffect(() => {
    if (hideSensitive && openIndex !== null) close({ replace: true });
  }, [hideSensitive, openIndex, close]);

  const items = media?.items ?? [];
  return {
    hidden: !configured || (media != null && !media.configured),
    items,
    shareUrl: media?.shareUrl ?? null,
    showSkeleton: isPending && expectedCount > 0,
    skeletonCount: expectedCount,
    showError: isError,
    showEmpty: isPending ? expectedCount === 0 : media != null && items.length === 0,
    toggleLike,
    openIndex: openIndex !== null && openIndex < items.length ? openIndex : null,
    open,
    close: () => close(),
  };
}
