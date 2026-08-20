export const queryKeys = {
  toys: ['toys'] as const,
  sessions: ['sessions'] as const,
  sessionList: (filter: string, ordering: string | undefined) =>
    ['sessions', 'list', filter, ordering ?? null] as const,
  media: ['media'] as const,
  mediaIndicators: ['media', 'indicators'] as const,
  sessionMedia: (sessionId: number) => ['media', 'session', sessionId] as const,
};
