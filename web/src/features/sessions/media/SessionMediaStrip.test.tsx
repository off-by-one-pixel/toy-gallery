// @vitest-environment happy-dom

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const stripState = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
}));

vi.mock('@/features/sessions/media/useMediaStrip', () => ({
  useMediaStrip: () => stripState.current,
}));

vi.mock('@/features/sessions/media/MediaLightbox', async () => {
  const { default: en } = await import('@/i18n/catalogs/en.json');
  return {
    default: ({ onClose }: { onClose: () => void }) => (
      <button type="button" aria-label={en.session.media.closeLabel} onClick={onClose} />
    ),
  };
});

import en from '@/i18n/catalogs/en.json';
import type { SessionMediaItem } from '@/api/types';
import { makeMediaItem } from '@/test/fixtures';
import { withAppProviders } from '@/test/render';
import SessionMediaStrip from '@/features/sessions/media/SessionMediaStrip';

const image = makeMediaItem();

const video = makeMediaItem({ id: 'a2', kind: 'video', liked: true });

const state = (overrides: Record<string, unknown> = {}) => ({
  hidden: false,
  items: [] as SessionMediaItem[],
  shareUrl: null,
  showSkeleton: false,
  skeletonCount: 0,
  showError: false,
  showEmpty: false,
  toggleLike: vi.fn(),
  openIndex: null,
  open: vi.fn(),
  close: vi.fn(),
  ...overrides,
});

const renderStrip = (overrides: Record<string, unknown> = {}) => {
  const value = state(overrides);
  stripState.current = value;
  render(withAppProviders(<SessionMediaStrip sessionId={1} expectedCount={1} />));
  return value;
};

describe('SessionMediaStrip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when hidden', () => {
    stripState.current = state({ hidden: true });
    const { container } = render(withAppProviders(<SessionMediaStrip sessionId={1} expectedCount={0} />));
    expect(container.innerHTML).toBe('');
  });

  it('shows skeleton placeholders while loading', () => {
    renderStrip({ showSkeleton: true, skeletonCount: 3 });
    expect(document.querySelectorAll('.animate-pulse')).toHaveLength(3);
  });

  it('shows the error and empty messages from state', () => {
    renderStrip({ showError: true, showEmpty: true });
    expect(screen.getByText(en.session.media.loadError)).toBeTruthy();
    expect(screen.getByText(en.session.media.empty)).toBeTruthy();
  });

  it('links to the external photo library when a share url is present', () => {
    renderStrip({ shareUrl: 'https://photos.example/share/K' });
    const link = screen.getByRole('link', { name: en.session.media.openExternal });
    expect(link.getAttribute('href')).toBe('https://photos.example/share/K');
  });

  it('opens the lightbox for the clicked item', () => {
    const value = renderStrip({ items: [image, video] });
    fireEvent.click(screen.getAllByRole('button', { name: en.session.media.openLabel })[1]);
    expect(value.open).toHaveBeenCalledWith(1);
  });

  it('marks liked items and toggles through the state handler', () => {
    const value = renderStrip({ items: [image, video] });
    const likeButton = screen.getByRole('button', { name: en.session.media.likeLabel });
    const unlikeButton = screen.getByRole('button', { name: en.session.media.unlikeLabel });
    expect(likeButton.getAttribute('aria-pressed')).toBe('false');
    expect(unlikeButton.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(likeButton);
    expect(value.toggleLike).toHaveBeenCalledWith(image);
  });

  it('mounts the lightbox at the open index and closes through state', () => {
    const value = renderStrip({ items: [image, video], openIndex: 0 });
    fireEvent.click(screen.getByRole('button', { name: en.session.media.closeLabel }));
    expect(value.close).toHaveBeenCalled();
  });
});
