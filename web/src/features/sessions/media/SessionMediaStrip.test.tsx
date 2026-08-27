// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
let search = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => '/sessions',
  useSearchParams: () => new URLSearchParams(search),
}));

import type { QueryClient } from '@tanstack/react-query';

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  fetchMediaStatus: vi.fn(),
  fetchSessionMedia: vi.fn(),
}));

import en from '@/i18n/catalogs/en.json';
import { fetchMediaStatus, fetchSessionMedia } from '@/api';
import type { SessionMedia } from '@/api/types';
import { createTestQueryClient } from '@/test/QueryWrapper';
import { withAppProviders } from '@/test/render';
import SessionMediaStrip from '@/features/sessions/media/SessionMediaStrip';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver ??= ResizeObserverStub as never;
window.HTMLMediaElement.prototype.play = () => Promise.resolve();
window.HTMLMediaElement.prototype.pause = () => {};

const wrap = (ui: React.ReactNode, client?: QueryClient) => withAppProviders(ui, { client });

const media = (items: SessionMedia['items'], overrides: Partial<Omit<SessionMedia, 'items'>> = {}): SessionMedia => ({
  configured: true,
  shareUrl: null,
  ...overrides,
  items,
});

const image = {
  id: 'a1',
  kind: 'image',
  takenAt: '2026-06-01T20:10:00',
  thumbnailUrl: 'https://immich/thumb1',
  fullUrl: 'https://immich/full1',
} as const;

const video = {
  id: 'a2',
  kind: 'video',
  takenAt: '2026-06-01T20:20:00',
  thumbnailUrl: 'https://immich/thumb2',
  fullUrl: 'https://immich/full2',
} as const;

const mediaStatus = (configured: boolean) => vi.mocked(fetchMediaStatus).mockResolvedValue({ configured });

const sessionMedia = (value: SessionMedia) => vi.mocked(fetchSessionMedia).mockResolvedValue(value);

const hangingSessionMedia = () =>
  vi.mocked(fetchSessionMedia).mockImplementation(() => new Promise<never>(() => undefined));

describe('SessionMediaStrip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    search = '';
    mediaStatus(true);
  });

  it('renders nothing when the media provider is not configured', async () => {
    mediaStatus(false);
    sessionMedia(media([]));
    const { container } = render(wrap(<SessionMediaStrip sessionId={1} expectedCount={1} />));
    await waitFor(() => expect(fetchMediaStatus).toHaveBeenCalled());
    expect(container.innerHTML).toBe('');
    expect(fetchSessionMedia).not.toHaveBeenCalled();
  });

  it('shows placeholders matching the expected count while loading', async () => {
    hangingSessionMedia();
    const { container } = render(wrap(<SessionMediaStrip sessionId={1} expectedCount={2} />));
    await screen.findByText(en.session.media.heading);
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(2);
    expect(screen.queryByText(en.session.media.empty)).toBeNull();
  });

  it('shows the empty message without placeholders when no media is expected', async () => {
    hangingSessionMedia();
    const { container } = render(wrap(<SessionMediaStrip sessionId={1} expectedCount={0} />));
    expect(await screen.findByText(en.session.media.empty)).toBeTruthy();
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(0);
  });

  it('invalidates its session detail query after loading media', async () => {
    sessionMedia(media([image, video]));
    const client = createTestQueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    render(wrap(<SessionMediaStrip sessionId={1} expectedCount={1} />, client));
    await screen.findAllByRole('button', { name: en.session.media.openLabel });
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['sessions', 'detail', 1] }));
  });

  it('does not touch the session detail query when media is not configured', async () => {
    sessionMedia(media([], { configured: false }));
    const client = createTestQueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { container } = render(wrap(<SessionMediaStrip sessionId={1} expectedCount={1} />, client));
    await waitFor(() => expect(container.innerHTML).toBe(''));
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['sessions', 'detail', 1] });
  });

  it('links to the external photo library when a share url is present', async () => {
    sessionMedia(media([image], { shareUrl: 'https://photos.example/share/K' }));
    render(wrap(<SessionMediaStrip sessionId={1} expectedCount={1} />));
    const link = await screen.findByRole('link', { name: en.session.media.openExternal });
    expect(link.getAttribute('href')).toBe('https://photos.example/share/K');
  });

  it('hides the external link when there is no share url', async () => {
    sessionMedia(media([image]));
    render(wrap(<SessionMediaStrip sessionId={1} expectedCount={1} />));
    await screen.findAllByRole('button', { name: en.session.media.openLabel });
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('shows the empty message when the window has no media', async () => {
    sessionMedia(media([]));
    render(wrap(<SessionMediaStrip sessionId={1} expectedCount={1} />));
    expect(await screen.findByText(en.session.media.empty)).toBeTruthy();
    expect(screen.getByText(en.session.media.heading)).toBeTruthy();
  });

  it('shows the error message when loading fails', async () => {
    vi.mocked(fetchSessionMedia).mockRejectedValue(new Error('boom'));
    render(wrap(<SessionMediaStrip sessionId={1} expectedCount={1} />));
    expect(await screen.findByText(en.session.media.loadError)).toBeTruthy();
  });

  it('opens the lightbox by pushing the media URL param', async () => {
    sessionMedia(media([image, video]));
    render(wrap(<SessionMediaStrip sessionId={1} expectedCount={1} />));
    const thumbs = await screen.findAllByRole('button', { name: en.session.media.openLabel });
    expect(thumbs).toHaveLength(2);
    expect(thumbs[0].querySelector('img')?.getAttribute('src')).toBe(image.thumbnailUrl);

    fireEvent.click(thumbs[1]);
    expect(push).toHaveBeenCalledWith('/sessions?media=1%3A1', { scroll: false });
  });

  it('shows the lightbox when the media param addresses this session', async () => {
    search = 'media=1:1';
    sessionMedia(media([image, video]));
    render(wrap(<SessionMediaStrip sessionId={1} expectedCount={1} />));
    expect(await screen.findByRole('button', { name: en.session.media.closeLabel })).toBeTruthy();
  });

  it('ignores media params for other sessions or out-of-range indexes', async () => {
    sessionMedia(media([image]));
    for (const value of ['media=2:0', 'media=1:5', 'media=junk']) {
      search = value;
      const view = render(wrap(<SessionMediaStrip sessionId={1} expectedCount={1} />));
      await screen.findAllByRole('button', { name: en.session.media.openLabel });
      expect(screen.queryByRole('button', { name: en.session.media.closeLabel })).toBeNull();
      view.unmount();
    }
  });

  it('closes by clearing the media param', async () => {
    search = 'media=1:0';
    sessionMedia(media([image]));
    render(wrap(<SessionMediaStrip sessionId={1} expectedCount={1} />));
    fireEvent.click(await screen.findByRole('button', { name: en.session.media.closeLabel }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/sessions', { scroll: false }));
  });
});
