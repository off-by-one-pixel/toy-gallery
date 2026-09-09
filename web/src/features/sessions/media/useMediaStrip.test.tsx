// @vitest-environment happy-dom

import type { QueryClient } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { settle } from '@/test/wait';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  fetchMediaStatus: vi.fn(),
  fetchSessionMedia: vi.fn(),
  setMediaLiked: vi.fn().mockResolvedValue(true),
}));

const lightboxState = vi.hoisted(() => ({
  current: { openIndex: null as number | null, open: vi.fn(), close: vi.fn() },
}));

vi.mock('@/features/sessions/media/useMediaLightboxNav', () => ({
  useMediaLightboxNav: () => lightboxState.current,
}));

import { fetchMediaStatus, fetchSessionMedia, setMediaLiked } from '@/api';
import type { SessionMedia, SessionMediaItem } from '@/api/types';
import { createTestQueryClient } from '@/test/QueryWrapper';
import { withAppProviders } from '@/test/render';
import { useMediaStrip } from '@/features/sessions/media/useMediaStrip';

const item = (overrides: Partial<SessionMediaItem> = {}): SessionMediaItem => ({
  id: 'a1',
  kind: 'image',
  takenAt: '2026-06-01T20:10:00',
  thumbnailUrl: 'https://immich/thumb1',
  fullUrl: 'https://immich/full1',
  liked: false,
  ...overrides,
});

const media = (overrides: Partial<SessionMedia> = {}): SessionMedia => ({
  configured: true,
  shareUrl: null,
  items: [],
  ...overrides,
});

const makeWrapper = (client: QueryClient) =>
  function Wrapper({ children }: Readonly<{ children: React.ReactNode }>) {
    return withAppProviders(children, { client });
  };

const renderStrip = (client: QueryClient = createTestQueryClient(), expectedCount = 1) =>
  renderHook(() => useMediaStrip(1, expectedCount), { wrapper: makeWrapper(client) });

describe('useMediaStrip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(setMediaLiked).mockResolvedValue(true);
    vi.mocked(fetchMediaStatus).mockResolvedValue({ configured: true });
  });

  it('hides and does not fetch media while the provider is not configured', async () => {
    vi.mocked(fetchMediaStatus).mockResolvedValue({ configured: false });
    const { result } = renderStrip();
    await settle(() => expect(fetchMediaStatus).toHaveBeenCalled());
    expect(result.current.hidden).toBe(true);
    expect(fetchSessionMedia).not.toHaveBeenCalled();
  });

  it('loads the session media once configured', async () => {
    vi.mocked(fetchSessionMedia).mockResolvedValue(media({ items: [item()], shareUrl: 'https://s' }));
    const { result } = renderStrip();
    await settle(() => expect(result.current.items).toHaveLength(1));
    expect(fetchSessionMedia).toHaveBeenCalledWith(1);
    expect(result.current.hidden).toBe(false);
    expect(result.current.shareUrl).toBe('https://s');
  });

  it('invalidates the session detail after media arrives', async () => {
    vi.mocked(fetchSessionMedia).mockResolvedValue(media());
    const client = createTestQueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    renderStrip(client);
    await settle(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['sessions', 'detail', 1] }));
  });

  it('hides and leaves the session detail alone when media is not configured server-side', async () => {
    vi.mocked(fetchSessionMedia).mockResolvedValue(media({ configured: false }));
    const client = createTestQueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderStrip(client);
    await settle(() => expect(result.current.hidden).toBe(true));
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['sessions', 'detail', 1] });
  });

  it('reports a load failure', async () => {
    vi.mocked(fetchSessionMedia).mockRejectedValue(new Error('boom'));
    const { result } = renderStrip();
    await settle(() => expect(result.current.showError).toBe(true));
  });

  it('toggles a like through the API and reconciles the cache', async () => {
    vi.mocked(fetchSessionMedia)
      .mockResolvedValueOnce(media({ items: [item()] }))
      .mockResolvedValue(media({ items: [item({ liked: true })] }));
    const client = createTestQueryClient();
    const { result } = renderStrip(client);
    await settle(() => expect(result.current.items).toHaveLength(1));

    act(() => result.current.toggleLike(result.current.items[0]));
    await settle(() => expect(setMediaLiked).toHaveBeenCalledWith('a1', true));
    await settle(() => expect(result.current.items[0].liked).toBe(true));
  });

  it('shows the skeleton while loading an expected count and the empty state otherwise', async () => {
    vi.mocked(fetchSessionMedia).mockResolvedValue(media());
    const { result } = renderStrip(createTestQueryClient(), 3);
    expect(result.current.showSkeleton).toBe(true);
    expect(result.current.skeletonCount).toBe(3);
    await settle(() => expect(result.current.showEmpty).toBe(true));
  });
});
