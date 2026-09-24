import type { Session, Toy } from '@/api/types';

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
