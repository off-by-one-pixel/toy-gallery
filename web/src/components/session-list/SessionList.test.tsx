// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/sessions',
}));

vi.mock('../../services/api', () => ({
  fetchSessions: vi.fn(),
  fetchToys: vi.fn(),
  fetchSessionStats: vi.fn(),
  fetchMediaIndicators: vi.fn(),
  refreshAllSessionMedia: vi.fn(),
  MEDIA_INDICATORS_CHANGED_EVENT: 'mediaIndicatorsChanged',
  fetchSessionMedia: vi.fn(),
  deleteSession: vi.fn(),
  fetchLiveSession: vi.fn(),
  startLiveSession: vi.fn(),
}));

import en from '../../i18n/catalogs/en.json';
import { AuthProvider } from '../../providers/AuthProvider';
import { LiveSessionProvider } from '../../providers/LiveSessionProvider';
import { GirthProvider } from '../../providers/GirthProvider';
import { PrivacyProvider } from '../../providers/PrivacyProvider';
import { ThemeProvider } from '../../providers/ThemeProvider';
import { UnitProvider } from '../../providers/UnitProvider';
import {
  fetchLiveSession,
  fetchMediaIndicators,
  fetchSessionMedia,
  fetchSessions,
  fetchSessionStats,
  fetchToys,
  MEDIA_INDICATORS_CHANGED_EVENT,
  startLiveSession,
} from '../../services/api';
import type { Session } from '../../services/types';
import SessionList from './SessionList';

const session = (id: number, startedAt: string, isLive = false): Session => ({
  id,
  startedAt,
  isLive,
  entries: [],
  maxInsertableLength: 120,
  maxCircumference: 110,
});

const wrap = (ui: React.ReactNode) => (
  <NextIntlClientProvider locale="en" messages={en}>
    <ThemeProvider>
      <UnitProvider>
        <GirthProvider>
          <PrivacyProvider>
            <AuthProvider>
              <LiveSessionProvider>{ui}</LiveSessionProvider>
            </AuthProvider>
          </PrivacyProvider>
        </GirthProvider>
      </UnitProvider>
    </ThemeProvider>
  </NextIntlClientProvider>
);

describe('SessionList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(fetchSessions).mockResolvedValue([session(1, '2026-06-01T20:00:00'), session(2, '2026-06-05T09:00:00')]);
    vi.mocked(fetchToys).mockResolvedValue([]);
    vi.mocked(fetchSessionStats).mockResolvedValue([]);
    vi.mocked(fetchMediaIndicators).mockResolvedValue({ configured: true, sessionIds: new Set([2]) });
    vi.mocked(fetchSessionMedia).mockResolvedValue({ configured: false, items: [] });
    vi.mocked(fetchLiveSession).mockResolvedValue(null);
  });

  it('renders a row per session and a media badge for flagged sessions', async () => {
    render(wrap(<SessionList />));
    await screen.findByText(`2 ${en.session.recorded}`);
    const rows = screen.getAllByRole('button', { name: en.session.detailsToggleLabel });
    expect(rows).toHaveLength(2);
    expect(screen.getAllByLabelText(en.session.media.indicatorLabel)).toHaveLength(1);
  });

  it('reloads indicators when the media-changed event fires', async () => {
    render(wrap(<SessionList />));
    await screen.findByText(`2 ${en.session.recorded}`);
    vi.mocked(fetchMediaIndicators).mockResolvedValue({ configured: true, sessionIds: new Set([1, 2]) });
    fireEvent(window, new Event(MEDIA_INDICATORS_CHANGED_EVENT));
    await waitFor(() => expect(screen.getAllByLabelText(en.session.media.indicatorLabel)).toHaveLength(2));
  });

  it('starts a live session from the toolbar button and hides it afterwards', async () => {
    vi.mocked(startLiveSession).mockResolvedValue(session(9, '2026-06-06T08:00:00', true));
    render(wrap(<SessionList />));
    const buttons = await screen.findAllByRole('button', { name: en.session.live.startButton });
    fireEvent.click(buttons[0]);
    await waitFor(() => expect(startLiveSession).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryAllByRole('button', { name: en.session.live.startButton })).toHaveLength(0));
    expect(screen.getByRole('button', { name: en.session.live.openButton })).toBeTruthy();
  });

  it('hides the start button and shows banner plus badge when a session is live', async () => {
    vi.mocked(fetchLiveSession).mockResolvedValue(session(1, '2026-06-01T20:00:00', true));
    vi.mocked(fetchSessions).mockResolvedValue([
      session(1, '2026-06-01T20:00:00', true),
      session(2, '2026-06-05T09:00:00'),
    ]);
    render(wrap(<SessionList />));
    await screen.findByText(`2 ${en.session.recorded}`);
    expect(screen.queryAllByRole('button', { name: en.session.live.startButton })).toHaveLength(0);
    expect(screen.getByRole('button', { name: en.session.live.openButton })).toBeTruthy();
    expect(screen.getAllByText(en.session.live.badge).length).toBeGreaterThanOrEqual(2);
  });

  it('requests strip stats with the filter window', async () => {
    render(wrap(<SessionList />));
    await screen.findByText(`2 ${en.session.recorded}`);
    const hourCalls = vi.mocked(fetchSessionStats).mock.calls.filter(([g]) => g === 'hour');
    expect(hourCalls.length).toBeGreaterThan(0);
    expect(hourCalls[hourCalls.length - 1][2]).toEqual({ start: undefined });

    fireEvent.click(screen.getByText(en.session.filter.week));
    await waitFor(() => {
      const calls = vi.mocked(fetchSessionStats).mock.calls.filter(([g]) => g === 'hour');
      const last = calls[calls.length - 1][2] as { start?: string };
      expect(last.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it('toggles row selection through the overlay button', async () => {
    render(wrap(<SessionList />));
    await screen.findByText(`2 ${en.session.recorded}`);
    const toggles = screen.getAllByRole('button', { name: en.session.detailsToggleLabel });
    expect(toggles).toHaveLength(2);
    const row = toggles[0].parentElement as HTMLElement;

    fireEvent.click(toggles[0]);
    expect(row.className).toContain('ring-accent');
    expect(toggles[0].getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(toggles[0]);
    expect(row.className).not.toContain('ring-accent');
    expect(toggles[0].getAttribute('aria-expanded')).toBe('false');
  });
});
