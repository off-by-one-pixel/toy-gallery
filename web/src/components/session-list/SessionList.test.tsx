// @vitest-environment jsdom

import type { QueryClient } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/sessions',
  useSearchParams: () => new URLSearchParams(),
}));

type IOCallback = (entries: Array<{ isIntersecting: boolean }>) => void;
const ioCallbacks: IOCallback[] = [];

class IntersectionObserverStub {
  constructor(callback: IOCallback) {
    ioCallbacks.push(callback);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);

vi.mock('@/api', () => ({
  fetchSessions: vi.fn(),
  fetchToys: vi.fn(),
  fetchSessionStats: vi.fn(),
  fetchMediaIndicators: vi.fn(),
  refreshAllSessionMedia: vi.fn(),
  fetchSessionMedia: vi.fn(),
  deleteSession: vi.fn(),
  fetchLiveSession: vi.fn(),
  startLiveSession: vi.fn(),
}));

import en from '@/i18n/catalogs/en.json';
import { AuthProvider } from '@/providers/AuthProvider';
import { GirthProvider } from '@/providers/GirthProvider';
import { PrivacyProvider } from '@/providers/PrivacyProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { UnitProvider } from '@/providers/UnitProvider';
import {
  fetchLiveSession,
  fetchMediaIndicators,
  fetchSessionMedia,
  fetchSessions,
  fetchSessionStats,
  fetchToys,
  startLiveSession,
} from '@/api';
import type { Session } from '@/api/types';
import { createTestQueryClient, QueryWrapper } from '@/test/QueryWrapper';
import SessionList from '@/components/session-list/SessionList';

const session = (id: number, startedAt: string, isLive = false): Session => ({
  id,
  startedAt,
  isLive,
  entries: [],
  maxInsertableLength: 120,
  maxCircumference: 110,
});

const pageOf = (sessions: Session[], overrides: Partial<{ count: number; hasMore: boolean }> = {}) => ({
  sessions,
  count: overrides.count ?? sessions.length,
  hasMore: overrides.hasMore ?? false,
});

const wrap = (ui: React.ReactNode, client?: QueryClient) => (
  <NextIntlClientProvider locale="en" messages={en}>
    <QueryWrapper client={client}>
      <ThemeProvider>
        <UnitProvider>
          <GirthProvider>
            <PrivacyProvider>
              <AuthProvider>{ui}</AuthProvider>
            </PrivacyProvider>
          </GirthProvider>
        </UnitProvider>
      </ThemeProvider>
    </QueryWrapper>
  </NextIntlClientProvider>
);

describe('SessionList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(fetchSessions).mockResolvedValue(
      pageOf([session(1, '2026-06-01T20:00:00'), session(2, '2026-06-05T09:00:00')]),
    );
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

  it('reloads indicators when the media queries are invalidated', async () => {
    const client = createTestQueryClient();
    render(wrap(<SessionList />, client));
    await screen.findByText(`2 ${en.session.recorded}`);
    vi.mocked(fetchMediaIndicators).mockResolvedValue({ configured: true, sessionIds: new Set([1, 2]) });
    void client.invalidateQueries({ queryKey: ['media'] });
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
    vi.mocked(fetchSessions).mockResolvedValue(
      pageOf([session(1, '2026-06-01T20:00:00', true), session(2, '2026-06-05T09:00:00')]),
    );
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

  it('shows the server count in the subtitle, not the loaded page size', async () => {
    vi.mocked(fetchSessions).mockResolvedValue(
      pageOf([session(1, '2026-06-01T20:00:00')], { count: 41, hasMore: true }),
    );
    render(wrap(<SessionList />));
    expect(await screen.findByText(`41 ${en.session.recorded}`)).toBeTruthy();
  });

  it('appends the next page without duplicating overlapping sessions', async () => {
    vi.mocked(fetchSessions)
      .mockResolvedValueOnce(
        pageOf([session(1, '2026-06-05T09:00:00'), session(2, '2026-06-04T09:00:00')], {
          count: 3,
          hasMore: true,
        }),
      )
      .mockResolvedValueOnce(
        pageOf([session(2, '2026-06-04T09:00:00'), session(3, '2026-06-03T09:00:00')], {
          count: 3,
          hasMore: false,
        }),
      );
    render(wrap(<SessionList />));
    await screen.findByText(`3 ${en.session.recorded}`);

    expect(ioCallbacks.length).toBeGreaterThan(0);
    ioCallbacks[ioCallbacks.length - 1]([{ isIntersecting: true }]);

    await waitFor(() => expect(screen.getAllByRole('button', { name: en.session.detailsToggleLabel })).toHaveLength(3));
    const pageArgs = vi.mocked(fetchSessions).mock.calls.map(([opts]) => opts?.page);
    expect(pageArgs).toContain(2);
  });

  it('refetches with the filter window start and the selected ordering', async () => {
    render(wrap(<SessionList />));
    await screen.findByText(`2 ${en.session.recorded}`);
    fireEvent.click(screen.getByText(en.session.filter.week));
    await waitFor(() => {
      const last = vi.mocked(fetchSessions).mock.calls.at(-1)?.[0];
      expect(last?.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(last?.page).toBe(1);
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
