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

const mediaState = vi.hoisted(() => ({
  current: { configured: true, media: undefined, isPending: true, isError: false } as {
    configured: boolean;
    media: unknown;
    isPending: boolean;
    isError: boolean;
  },
}));

vi.mock('@/features/sessions/media/useSessionMedia', () => ({
  useSessionMedia: () => mediaState.current,
}));

import en from '@/i18n/catalogs/en.json';
import type { SessionMedia } from '@/api/types';
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

const setMedia = (value: SessionMedia) => {
  mediaState.current = { configured: true, media: value, isPending: false, isError: false };
};

const renderStrip = (expectedCount = 1) =>
  render(withAppProviders(<SessionMediaStrip sessionId={1} expectedCount={expectedCount} />));

describe('SessionMediaStrip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    search = '';
    mediaState.current = { configured: true, media: undefined, isPending: true, isError: false };
  });

  it('renders nothing when the media provider is not configured', () => {
    mediaState.current = { configured: false, media: undefined, isPending: true, isError: false };
    const { container } = renderStrip();
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when the server reports media unconfigured', () => {
    setMedia(media([], { configured: false }));
    const { container } = renderStrip();
    expect(container.innerHTML).toBe('');
  });

  it('shows placeholders matching the expected count while loading', () => {
    const { container } = renderStrip(2);
    expect(screen.getByText(en.session.media.heading)).toBeTruthy();
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(2);
    expect(screen.queryByText(en.session.media.empty)).toBeNull();
  });

  it('shows the empty message without placeholders when no media is expected', () => {
    const { container } = renderStrip(0);
    expect(screen.getByText(en.session.media.empty)).toBeTruthy();
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(0);
  });

  it('links to the external photo library when a share url is present', () => {
    setMedia(media([image], { shareUrl: 'https://photos.example/share/K' }));
    renderStrip();
    const link = screen.getByRole('link', { name: en.session.media.openExternal });
    expect(link.getAttribute('href')).toBe('https://photos.example/share/K');
  });

  it('hides the external link when there is no share url', () => {
    setMedia(media([image]));
    renderStrip();
    expect(screen.getAllByRole('button', { name: en.session.media.openLabel })).toHaveLength(1);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('shows the empty message when the window has no media', () => {
    setMedia(media([]));
    renderStrip();
    expect(screen.getByText(en.session.media.empty)).toBeTruthy();
    expect(screen.getByText(en.session.media.heading)).toBeTruthy();
  });

  it('shows the error message when loading fails', () => {
    mediaState.current = { configured: true, media: undefined, isPending: false, isError: true };
    renderStrip();
    expect(screen.getByText(en.session.media.loadError)).toBeTruthy();
  });

  it('opens the lightbox by pushing the media URL param', () => {
    setMedia(media([image, video]));
    renderStrip();
    const thumbs = screen.getAllByRole('button', { name: en.session.media.openLabel });
    expect(thumbs).toHaveLength(2);
    expect(thumbs[0].querySelector('img')?.getAttribute('src')).toBe(image.thumbnailUrl);

    fireEvent.click(thumbs[1]);
    expect(push).toHaveBeenCalledWith('/sessions?media=1%3A1', { scroll: false });
  });

  it('shows the lightbox when the media param addresses this session', () => {
    search = 'media=1:1';
    setMedia(media([image, video]));
    renderStrip();
    expect(screen.getByRole('button', { name: en.session.media.closeLabel })).toBeTruthy();
  });

  it('ignores media params for other sessions or out-of-range indexes', () => {
    setMedia(media([image]));
    for (const value of ['media=2:0', 'media=1:5', 'media=junk']) {
      search = value;
      const view = renderStrip();
      expect(screen.getAllByRole('button', { name: en.session.media.openLabel })).toHaveLength(1);
      expect(screen.queryByRole('button', { name: en.session.media.closeLabel })).toBeNull();
      view.unmount();
    }
  });

  it('closes by clearing the media param', async () => {
    search = 'media=1:0';
    setMedia(media([image]));
    renderStrip();
    fireEvent.click(screen.getByRole('button', { name: en.session.media.closeLabel }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/sessions', { scroll: false }));
  });
});
