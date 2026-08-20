export const queryKeys = {
  toys: ['toys'] as const,
  sessions: ['sessions'] as const,
  sessionList: (filter: string, ordering: string | undefined) =>
    ['sessions', 'list', filter, ordering ?? null] as const,
  sessionStats: ['sessions', 'stats'] as const,
  sessionStatsQuery: (groupBy: string, metrics: readonly string[], start: string | undefined) =>
    ['sessions', 'stats', groupBy, [...metrics], start ?? null] as const,
  media: ['media'] as const,
  mediaIndicators: ['media', 'indicators'] as const,
  sessionMedia: (sessionId: number) => ['media', 'session', sessionId] as const,
};
