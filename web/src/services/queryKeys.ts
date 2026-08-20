export const queryKeys = {
  media: ['media'] as const,
  mediaIndicators: ['media', 'indicators'] as const,
  sessionMedia: (sessionId: number) => ['media', 'session', sessionId] as const,
};
