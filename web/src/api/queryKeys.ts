import type { QueryClient } from '@tanstack/react-query';

export const queryKeys = {
  toys: {
    all: ['toys'] as const,
  },
  sessions: {
    all: ['sessions'] as const,
    lists: ['sessions', 'list'] as const,
    list: (filter: string, ordering: string | undefined, filters: string) =>
      ['sessions', 'list', filter, ordering ?? null, filters] as const,
    detail: (id: number) => ['sessions', 'detail', id] as const,
    live: ['sessions', 'live'] as const,
    stats: ['sessions', 'stats'] as const,
    stat: (groupBy: string, metrics: readonly string[], start: string | undefined, filters: string) =>
      ['sessions', 'stats', groupBy, [...metrics], start ?? null, filters] as const,
  },
  media: {
    all: ['media'] as const,
    status: ['media', 'status'] as const,
    session: (sessionId: number) => ['media', 'session', sessionId] as const,
  },
};

export const invalidateSessionData = (queryClient: QueryClient): void => {
  void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.lists });
  void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.stats });
  void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.live });
};
