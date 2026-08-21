import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/generated/sdk', () => ({
  toysSessionsMediaIndicatorsRetrieve: vi.fn(),
  toysSessionsRefreshMediaCreate: vi.fn(),
  toysSessionsMediaRetrieve: vi.fn(),
}));

import {
  toysSessionsMediaIndicatorsRetrieve,
  toysSessionsMediaRetrieve,
  toysSessionsRefreshMediaCreate,
} from '@/api/generated/sdk';
import { fetchMediaIndicators, fetchSessionMedia, refreshAllSessionMedia } from '@/api/index';

describe('media API wrappers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetchMediaIndicators maps per-session counts', async () => {
    vi.mocked(toysSessionsMediaIndicatorsRetrieve).mockResolvedValue({
      data: {
        configured: true,
        sessions: [
          { id: 3, photos: 2, videos: 0 },
          { id: 7, photos: 1, videos: 4 },
        ],
      },
    } as never);
    const result = await fetchMediaIndicators();
    expect(result.configured).toBe(true);
    expect(result.counts.get(3)).toEqual({ photos: 2, videos: 0 });
    expect(result.counts.get(7)).toEqual({ photos: 1, videos: 4 });
    expect(result.counts.size).toBe(2);
  });

  it('refreshAllSessionMedia maps per-session counts', async () => {
    vi.mocked(toysSessionsRefreshMediaCreate).mockResolvedValue({
      data: { configured: false, sessions: [] },
    } as never);
    const result = await refreshAllSessionMedia();
    expect(result.configured).toBe(false);
    expect(result.counts.size).toBe(0);
  });

  it('fetchSessionMedia camelizes items', async () => {
    vi.mocked(toysSessionsMediaRetrieve).mockResolvedValue({
      data: {
        configured: true,
        items: [
          {
            id: 'a1',
            kind: 'image',
            taken_at: '2026-06-01T20:10:00',
            thumbnail_url: 'https://immich/thumb',
            full_url: 'https://immich/full',
          },
        ],
      },
    } as never);
    const media = await fetchSessionMedia(9);
    expect(toysSessionsMediaRetrieve).toHaveBeenCalledWith(9);
    expect(media.items[0]).toEqual({
      id: 'a1',
      kind: 'image',
      takenAt: '2026-06-01T20:10:00',
      thumbnailUrl: 'https://immich/thumb',
      fullUrl: 'https://immich/full',
    });
  });
});
