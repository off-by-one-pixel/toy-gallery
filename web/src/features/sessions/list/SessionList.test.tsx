// @vitest-environment jsdom

import type { QueryClient } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let search = '';
const searchListeners = new Set<() => void>();
const navigate = (href: string) => {
  search = href.split('?')[1] ?? '';
  for (const listener of searchListeners) listener();
};

vi.mock('next/navigation', async () => {
  const { useSyncExternalStore } = await import('react');
  return {
    useRouter: () => ({ push: navigate, replace: navigate }),
    usePathname: () => '/sessions',
    useSearchParams: () => {
      const current = useSyncExternalStore(
        (onChange) => {
          searchListeners.add(onChange);
          return () => searchListeners.delete(onChange);
        },
        () => search,
      );
      return new URLSearchParams(current);
    },
  };
});

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

import en from '@/i18n/catalogs/en.json';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { GirthProvider } from '@/features/preferences/GirthProvider';
import { PrivacyProvider } from '@/features/preferences/PrivacyProvider';
import { ThemeProvider } from '@/features/preferences/ThemeProvider';
import { UnitProvider } from '@/features/preferences/UnitProvider';
import type { Session, Toy } from '@/api/types';
import { api, capture, http, HttpResponse, liveWire, server, sessionPageWire, wire } from '@/test/msw';
import { createTestQueryClient, QueryWrapper } from '@/test/QueryWrapper';
import SessionList from '@/features/sessions/list/SessionList';

const session = (
  id: number,
  startedAt: string,
  isLive = false,
  media: { photos: number; videos: number } = { photos: 0, videos: 0 },
): Session => ({
  id,
  startedAt,
  isLive,
  photoCount: media.photos,
  videoCount: media.videos,
  entries: [],
  records: [],
  totalToyDurationMinutes: null,
  maxInsertableLength: 120,
  maxCircumference: 110,
});

const toyFixture = (id: number, name: string, usageCount: number): Toy =>
  ({
    id,
    brand: 'B',
    name,
    size: '',
    usageCount,
    totalDurationMinutes: 0,
    shape: { sections: [] },
  }) as Toy;

let respondSessions: (url: URL) => object;
const sessionRequests: URL[] = [];
const statsRequests: URL[] = [];
let toys: Toy[] = [];
let liveNow: Session | null = null;

const hourStatsRequests = () => statsRequests.filter((u) => u.searchParams.get('group_by') === 'hour');

const installListHandlers = () => {
  server.use(
    http.get(api('/toys/sessions/'), ({ request }) => {
      const url = new URL(request.url);
      sessionRequests.push(url);
      return HttpResponse.json(respondSessions(url) as never);
    }),
    http.get(api('/toys/sessions/stats/'), ({ request }) => {
      const url = new URL(request.url);
      statsRequests.push(url);
      const groups =
        url.searchParams.get('group_by') === 'toy'
          ? [
              { key: '1', values: { count: 9 } },
              { key: '2', values: { count: 3 } },
            ]
          : [];
      return HttpResponse.json({ groups });
    }),
    http.get(api('/toys/toys/'), () => HttpResponse.json(toys.map((t) => wire(t)))),
    http.get(api('/toys/sessions/live/'), () => HttpResponse.json(liveWire(liveNow))),
  );
};

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
    search = '';
    sessionRequests.length = 0;
    statsRequests.length = 0;
    toys = [];
    liveNow = null;
    respondSessions = () =>
      sessionPageWire([
        session(1, '2026-06-01T20:00:00'),
        session(2, '2026-06-05T09:00:00', false, { photos: 2, videos: 1 }),
      ]);
    installListHandlers();
  });

  it('renders a row per session and a media badge for flagged sessions', async () => {
    render(wrap(<SessionList />));
    await screen.findByText(`2 ${en.session.recorded}`);
    const rows = screen.getAllByRole('button', { name: en.session.detailsToggleLabel });
    expect(rows).toHaveLength(2);
    expect(screen.getAllByLabelText('2 photos, 1 videos')).toHaveLength(1);
  });

  it('marks the record-setting toy and the peak value with trophies, skipping unknown keys', async () => {
    toys = [toyFixture(1, 'Steel', 9)];
    respondSessions = () =>
      sessionPageWire([
        {
          ...session(1, '2026-06-01T20:00:00'),
          entries: [{ toy: 1, involvement: 'FULLY_INSERTED' }],
          records: [
            { key: 'pr-width', toy: 1, value: 240, achievedAt: '2026-06-01T21:00:00' },
            { key: 'pr-future', toy: 1, value: 5, achievedAt: '2026-06-01T21:00:00' },
          ],
        },
        session(2, '2026-06-05T09:00:00'),
      ]);
    render(wrap(<SessionList />));
    await screen.findByText(`2 ${en.session.recorded}`);
    expect(screen.getAllByLabelText(en.session.records.widthCircumference)).toHaveLength(2);
    expect(screen.queryByLabelText(/pr-future/)).toBeNull();

    const rows = screen.getAllByRole('button', { name: en.session.detailsToggleLabel }).map((b) => b.parentElement);
    expect(rows[0]?.className).toContain('border-amber-500');
    expect(rows[1]?.className).not.toContain('border-amber-500');
  });

  it('shows refreshed counts when the session list is invalidated', async () => {
    const client = createTestQueryClient();
    render(wrap(<SessionList />, client));
    await screen.findByText(`2 ${en.session.recorded}`);
    respondSessions = () =>
      sessionPageWire([
        session(1, '2026-06-01T20:00:00', false, { photos: 1, videos: 0 }),
        session(2, '2026-06-05T09:00:00', false, { photos: 2, videos: 1 }),
      ]);
    void client.invalidateQueries({ queryKey: ['sessions', 'list'] });
    await waitFor(() => expect(screen.getAllByLabelText(/\d+ photos, \d+ videos/)).toHaveLength(2));
  });

  it('starts a live session from the toolbar button and hides it afterwards', async () => {
    const started = capture('post', api('/toys/sessions/start/'), () => wire(session(9, '2026-06-06T08:00:00', true)));
    render(wrap(<SessionList />));
    const buttons = await screen.findAllByRole('button', { name: en.session.live.startButton });
    fireEvent.click(buttons[0]);
    await waitFor(() => expect(started.urls).toHaveLength(1));
    await waitFor(() => expect(screen.queryAllByRole('button', { name: en.session.live.startButton })).toHaveLength(0));
    expect(screen.getByRole('button', { name: en.session.live.openButton })).toBeTruthy();
  });

  it('hides the start button and shows banner plus badge when a session is live', async () => {
    liveNow = session(1, '2026-06-01T20:00:00', true);
    respondSessions = () =>
      sessionPageWire([session(1, '2026-06-01T20:00:00', true), session(2, '2026-06-05T09:00:00')]);
    render(wrap(<SessionList />));
    await screen.findByText(`2 ${en.session.recorded}`);
    expect(screen.queryAllByRole('button', { name: en.session.live.startButton })).toHaveLength(0);
    expect(screen.getByRole('button', { name: en.session.live.openButton })).toBeTruthy();
    expect(screen.getAllByText(en.session.live.badge).length).toBeGreaterThanOrEqual(2);
  });

  it('requests strip stats with the filter window', async () => {
    render(wrap(<SessionList />));
    await screen.findByText(`2 ${en.session.recorded}`);
    const hourCalls = hourStatsRequests();
    expect(hourCalls.length).toBeGreaterThan(0);
    const last = hourCalls[hourCalls.length - 1];
    expect(last.searchParams.has('start')).toBe(false);
    expect(last.searchParams.has('toys')).toBe(false);
    expect(last.searchParams.has('has_media')).toBe(false);

    fireEvent.click(screen.getByText(en.session.filter.week));
    await waitFor(() => {
      const calls = hourStatsRequests();
      expect(calls[calls.length - 1].searchParams.get('start')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it('shows the server count in the subtitle, not the loaded page size', async () => {
    respondSessions = () => sessionPageWire([session(1, '2026-06-01T20:00:00')], { count: 41, hasMore: true });
    render(wrap(<SessionList />));
    expect(await screen.findByText(`41 ${en.session.recorded}`)).toBeTruthy();
  });

  it('appends the next page without duplicating overlapping sessions', async () => {
    respondSessions = (url) =>
      url.searchParams.get('page') === '2'
        ? sessionPageWire([session(2, '2026-06-04T09:00:00'), session(3, '2026-06-03T09:00:00')], {
            count: 3,
            hasMore: false,
          })
        : sessionPageWire([session(1, '2026-06-05T09:00:00'), session(2, '2026-06-04T09:00:00')], {
            count: 3,
            hasMore: true,
          });
    render(wrap(<SessionList />));
    await screen.findByText(`3 ${en.session.recorded}`);

    expect(ioCallbacks.length).toBeGreaterThan(0);
    ioCallbacks[ioCallbacks.length - 1]([{ isIntersecting: true }]);

    await waitFor(() => expect(screen.getAllByRole('button', { name: en.session.detailsToggleLabel })).toHaveLength(3));
    expect(sessionRequests.map((u) => u.searchParams.get('page'))).toContain('2');
  });

  it('refetches with the filter window start and the selected ordering', async () => {
    render(wrap(<SessionList />));
    await screen.findByText(`2 ${en.session.recorded}`);
    fireEvent.click(screen.getByText(en.session.filter.week));
    await waitFor(() => {
      const last = sessionRequests[sessionRequests.length - 1];
      expect(last.searchParams.get('start')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(last.searchParams.get('page')).toBe('1');
    });
  });

  it('filters by toy and media through the filter popover', async () => {
    toys = [toyFixture(1, 'Steel', 9), toyFixture(2, 'Ember', 3)];
    render(wrap(<SessionList />));
    await screen.findByText(`2 ${en.session.recorded}`);

    fireEvent.click(screen.getByRole('button', { name: en.session.filters.buttonLabel }));
    fireEvent.click(await screen.findByRole('checkbox', { name: /B Steel/ }));
    await waitFor(() => {
      const last = sessionRequests[sessionRequests.length - 1];
      expect(last.searchParams.get('toys')).toBe('1');
      expect(last.searchParams.get('page')).toBe('1');
    });

    fireEvent.click(screen.getByRole('checkbox', { name: en.session.filters.hasMedia }));
    await waitFor(() => {
      const last = sessionRequests[sessionRequests.length - 1];
      expect(last.searchParams.get('has_media')).toBe('true');
    });
  });

  it('shows active filters as dismissible chips and clears them', async () => {
    toys = [toyFixture(1, 'Steel', 9)];
    render(wrap(<SessionList />));
    await screen.findByText(`2 ${en.session.recorded}`);

    fireEvent.click(screen.getByRole('button', { name: en.session.filters.buttonLabel }));
    fireEvent.click(await screen.findByRole('checkbox', { name: /B Steel/ }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'B Steel ×' }));
    await waitFor(() => expect(new URLSearchParams(search).has('toys')).toBe(false));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'B Steel ×' })).toBeNull());
  });

  it('seeds the toy filter from the toys url param', async () => {
    search = 'toys=1';
    toys = [toyFixture(1, 'Steel', 9)];
    render(wrap(<SessionList />));
    await screen.findByText(`2 ${en.session.recorded}`);
    expect(sessionRequests[0].searchParams.get('toys')).toBe('1');
    expect(await screen.findByRole('button', { name: 'B Steel ×' })).toBeTruthy();
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
