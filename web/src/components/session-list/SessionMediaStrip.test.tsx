// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/api', () => ({
  fetchSessionMedia: vi.fn(),
}));

import en from '../../i18n/catalogs/en.json';
import { PrivacyProvider } from '../../providers/PrivacyProvider';
import { fetchSessionMedia } from '../../services/api';
import type { SessionMedia } from '../../services/types';
import SessionMediaStrip from './SessionMediaStrip';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver ??= ResizeObserverStub as never;
window.HTMLMediaElement.prototype.play = () => Promise.resolve();
window.HTMLMediaElement.prototype.pause = () => {};

const wrap = (ui: React.ReactNode) => (
  <NextIntlClientProvider locale="en" messages={en}>
    <PrivacyProvider>{ui}</PrivacyProvider>
  </NextIntlClientProvider>
);

const media = (items: SessionMedia['items'], configured = true): SessionMedia => ({ configured, items });

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

describe('SessionMediaStrip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders nothing when the backend is not configured', async () => {
    vi.mocked(fetchSessionMedia).mockResolvedValue(media([], false));
    const { container } = render(wrap(<SessionMediaStrip sessionId={1} />));
    await waitFor(() => expect(container.innerHTML).toBe(''));
  });

  it('shows the empty message when the window has no media', async () => {
    vi.mocked(fetchSessionMedia).mockResolvedValue(media([]));
    render(wrap(<SessionMediaStrip sessionId={1} />));
    expect(await screen.findByText(en.session.media.empty)).toBeTruthy();
    expect(screen.getByText(en.session.media.heading)).toBeTruthy();
  });

  it('hides the heading when showHeading is false', async () => {
    vi.mocked(fetchSessionMedia).mockResolvedValue(media([]));
    render(wrap(<SessionMediaStrip sessionId={1} showHeading={false} />));
    await screen.findByText(en.session.media.empty);
    expect(screen.queryByText(en.session.media.heading)).toBeNull();
  });

  it('shows the error message when loading fails', async () => {
    vi.mocked(fetchSessionMedia).mockRejectedValue(new Error('boom'));
    render(wrap(<SessionMediaStrip sessionId={1} />));
    expect(await screen.findByText(en.session.media.loadError)).toBeTruthy();
  });

  it('renders a thumbnail per item and opens the lightbox on click', async () => {
    vi.mocked(fetchSessionMedia).mockResolvedValue(media([image, video]));
    render(wrap(<SessionMediaStrip sessionId={1} />));
    const thumbs = await screen.findAllByRole('button', { name: en.session.media.openLabel });
    expect(thumbs).toHaveLength(2);
    expect(thumbs[0].querySelector('img')?.getAttribute('src')).toBe(image.thumbnailUrl);

    fireEvent.click(thumbs[1]);
    expect(await screen.findByRole('button', { name: en.session.media.closeLabel })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: en.session.media.closeLabel }));
    await waitFor(() => expect(screen.queryByRole('button', { name: en.session.media.closeLabel })).toBeNull());
  });
});
