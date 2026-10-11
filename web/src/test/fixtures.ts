import type { Session, SessionMediaItem, Toy } from '@/api/types';
import type { GhostToy } from '@/features/toys/gallery/ghost/ghosts';

export const makeSession = (overrides: Partial<Session> = {}): Session =>
  ({
    id: 1,
    startedAt: '2026-08-21T10:00:00Z',
    isLive: false,
    photoCount: 0,
    videoCount: 0,
    entries: [],
    records: [],
    totalToyDurationMinutes: null,
    maxInsertableLength: null,
    maxCircumference: null,
    ...overrides,
  }) as Session;

export const makeToy = (overrides: Partial<Toy> = {}): Toy =>
  ({
    id: 1,
    brand: 'B',
    name: 'toy',
    size: '',
    usageCount: 0,
    totalDurationMinutes: 0,
    maxDurationMinutes: 0,
    records: [],
    shape: { sections: [] },
    ...overrides,
  }) as Toy;

export const makeGhost = (overrides: Partial<GhostToy> = {}): GhostToy => ({
  id: 1,
  sourceName: 'Acme Slim M',
  circumference: 140,
  insertableLength: 165,
  shape: { sections: [{ order: 0, diameter: 45, height: 150 }] } as GhostToy['shape'],
  ...overrides,
});

export const makeMediaItem = (overrides: Partial<SessionMediaItem> = {}): SessionMediaItem => ({
  id: 'a1',
  kind: 'image',
  takenAt: '2026-06-01T20:10:00',
  thumbnailUrl: 'https://immich/thumb1',
  fullUrl: 'https://immich/full1',
  liked: false,
  ...overrides,
});
