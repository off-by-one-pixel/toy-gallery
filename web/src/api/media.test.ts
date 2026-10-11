import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/generated/sdk', () => ({
  toysSessionsMediaStatusRetrieve: vi.fn(),
  toysSessionsRefreshMediaCreate: vi.fn(),
  toysSessionsMediaRetrieve: vi.fn(),
}));

import {
  toysSessionsMediaStatusRetrieve,
  toysSessionsMediaRetrieve,
  toysSessionsRefreshMediaCreate,
} from '@/api/generated/sdk';
import { fetchMediaStatus, fetchSessionMedia, refreshAllSessionMedia } from '@/api/index';

describe('media API wrappers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetchMediaStatus reports the configured flag', async () => {
    vi.mocked(toysSessionsMediaStatusRetrieve).mockResolvedValue({ configured: true } as never);
    const result = await fetchMediaStatus();
    expect(result).toEqual({ configured: true });
  });

  it('refreshAllSessionMedia maps the refresh summary', async () => {
    vi.mocked(toysSessionsRefreshMediaCreate).mockResolvedValue({ configured: true, sessions_with_media: 4 } as never);
    const result = await refreshAllSessionMedia();
    expect(result).toEqual({ configured: true, sessionsWithMedia: 4 });
  });

  it('fetchSessionMedia camelizes items', async () => {
    vi.mocked(toysSessionsMediaRetrieve).mockResolvedValue({
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
