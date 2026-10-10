import type { QueryClient, QueryKey } from '@tanstack/react-query';

export const queryKeys = {
  toys: {
    all: ['toys'] as const,
    attributeSuggestions: ['toys', 'attributeSuggestions'] as const,
  },
  sessions: {
    all: ['sessions'] as const,
    lists: ['sessions', 'list'] as const,
    list: (filter: string, ordering: string | undefined, filters: string) =>
      ['sessions', 'list', filter, ordering ?? null, filters] as const,
    detail: (id: number) => ['sessions', 'detail', id] as const,
    live: ['sessions', 'live'] as const,
    stats: ['sessions', 'stats'] as const,
    stat: (groupBy: string, metrics: readonly string[], range: string, filters: string) =>
      ['sessions', 'stats', groupBy, [...metrics], range, filters] as const,
  },
  media: {
    all: ['media'] as const,
    status: ['media', 'status'] as const,
    session: (sessionId: number) => ['media', 'session', sessionId] as const,
  },
};

export const sessionHistoryKeys = [queryKeys.toys.all, queryKeys.sessions.lists, queryKeys.sessions.stats] as const;

export const sessionDataKeys = [...sessionHistoryKeys, queryKeys.sessions.live] as const;

const invalidateEach = (queryClient: QueryClient, keys: readonly QueryKey[]): void => {
  for (const queryKey of keys) void queryClient.invalidateQueries({ queryKey });
};

export const invalidateSessionHistory = (queryClient: QueryClient): void =>
  invalidateEach(queryClient, sessionHistoryKeys);

export const invalidateSessionData = (queryClient: QueryClient): void => invalidateEach(queryClient, sessionDataKeys);

export const invalidateAllData = (queryClient: QueryClient): void => void queryClient.invalidateQueries();
