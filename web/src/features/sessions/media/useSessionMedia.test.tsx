// @vitest-environment happy-dom

import type { QueryClient } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { settle } from '@/test/wait';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  fetchMediaStatus: vi.fn(),
  fetchSessionMedia: vi.fn(),
}));

import { fetchMediaStatus, fetchSessionMedia } from '@/api';
import type { SessionMedia } from '@/api/types';
import { createTestQueryClient } from '@/test/QueryWrapper';
import { withAppProviders } from '@/test/render';
import { useSessionMedia } from '@/features/sessions/media/useSessionMedia';

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

const renderMedia = (client: QueryClient = createTestQueryClient()) =>
  renderHook(() => useSessionMedia(1), { wrapper: makeWrapper(client) });

describe('useSessionMedia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchMediaStatus).mockResolvedValue({ configured: true, likesConfigured: true });
  });

  it('does not fetch media while the provider is not configured', async () => {
    vi.mocked(fetchMediaStatus).mockResolvedValue({ configured: false, likesConfigured: false });
    const { result } = renderMedia();
    await settle(() => expect(fetchMediaStatus).toHaveBeenCalled());
    expect(result.current.configured).toBe(false);
    expect(fetchSessionMedia).not.toHaveBeenCalled();
  });

  it('loads the session media once configured', async () => {
    vi.mocked(fetchSessionMedia).mockResolvedValue(media());
    const { result } = renderMedia();
    await settle(() => expect(result.current.media).toEqual(media()));
    expect(fetchSessionMedia).toHaveBeenCalledWith(1);
  });

  it('invalidates the session detail after media arrives', async () => {
    vi.mocked(fetchSessionMedia).mockResolvedValue(media());
    const client = createTestQueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    renderMedia(client);
    await settle(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['sessions', 'detail', 1] }));
  });

  it('leaves the session detail alone when media is not configured server-side', async () => {
    vi.mocked(fetchSessionMedia).mockResolvedValue(media({ configured: false }));
    const client = createTestQueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderMedia(client);
    await settle(() => expect(result.current.media).toBeTruthy());
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['sessions', 'detail', 1] });
  });

  it('reports a load failure', async () => {
    vi.mocked(fetchSessionMedia).mockRejectedValue(new Error('boom'));
    const { result } = renderMedia();
    await settle(() => expect(result.current.isError).toBe(true));
  });
});
