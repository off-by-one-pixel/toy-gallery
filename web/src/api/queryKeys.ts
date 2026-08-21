export const queryKeys = {
  toys: {
    all: ['toys'] as const,
  },
  sessions: {
    all: ['sessions'] as const,
    lists: ['sessions', 'list'] as const,
    list: (filter: string, ordering: string | undefined) => ['sessions', 'list', filter, ordering ?? null] as const,
    detail: (id: number) => ['sessions', 'detail', id] as const,
    live: ['sessions', 'live'] as const,
    stats: ['sessions', 'stats'] as const,
    stat: (groupBy: string, metrics: readonly string[], start: string | undefined) =>
      ['sessions', 'stats', groupBy, [...metrics], start ?? null] as const,
  },
  media: {
    all: ['media'] as const,
    status: ['media', 'status'] as const,
    session: (sessionId: number) => ['media', 'session', sessionId] as const,
  },
};
