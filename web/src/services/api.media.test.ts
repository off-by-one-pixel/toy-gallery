import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./generated/sdk', () => ({
  toysSessionsMediaIndicatorsRetrieve: vi.fn(),
  toysSessionsRefreshMediaCreate: vi.fn(),
  toysSessionsMediaRetrieve: vi.fn(),
}));

import {
  toysSessionsMediaIndicatorsRetrieve,
  toysSessionsMediaRetrieve,
  toysSessionsRefreshMediaCreate,
} from './generated/sdk';
import { fetchMediaIndicators, fetchSessionMedia, refreshAllSessionMedia } from './api';

describe('media API wrappers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetchMediaIndicators converts ids into a Set', async () => {
    vi.mocked(toysSessionsMediaIndicatorsRetrieve).mockResolvedValue({
      data: { configured: true, session_ids: [3, 7] },
    } as never);
    const result = await fetchMediaIndicators();
    expect(result.configured).toBe(true);
    expect(result.sessionIds).toEqual(new Set([3, 7]));
  });

  it('refreshAllSessionMedia converts ids into a Set', async () => {
    vi.mocked(toysSessionsRefreshMediaCreate).mockResolvedValue({
      data: { configured: false, session_ids: [] },
    } as never);
    const result = await refreshAllSessionMedia();
    expect(result.configured).toBe(false);
    expect(result.sessionIds.size).toBe(0);
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
