// @vitest-environment jsdom

import { act, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/',
}));

import en from '@/i18n/catalogs/en.json';
import { useLiveSession } from '@/features/sessions/live/useLiveSession';
import type { Session } from '@/api/types';
import { api, capture, http, HttpResponse, liveWire, server, wire } from '@/test/msw';
import { QueryWrapper } from '@/test/QueryWrapper';
import LiveSessionBanner from '@/features/sessions/live/LiveSessionBanner';

const live = (startedAt: string): Session => ({
  id: 5,
  startedAt,
  isLive: true,
  entries: [],
  records: [],
  maxInsertableLength: null,
  maxCircumference: null,
});

let liveNow: Session | null = null;

const useLiveState = () =>
  server.use(http.get(api('/toys/sessions/live/'), () => HttpResponse.json(liveWire(liveNow))));

function StartProbe() {
  const { liveSession, isLoaded, start } = useLiveSession();
  return (
    <button type="button" onClick={() => void start()}>
      {isLoaded ? (liveSession ? `live:${liveSession.id}` : 'idle') : 'loading'}
    </button>
  );
}

const wrap = (ui: React.ReactNode) => (
  <NextIntlClientProvider locale="en" messages={en}>
    <QueryWrapper>{ui}</QueryWrapper>
  </NextIntlClientProvider>
);

describe('LiveSessionBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    liveNow = null;
    useLiveState();
  });

  it('renders nothing when no session is live', async () => {
    render(wrap(<LiveSessionBanner />));
    await screen.findByText('idle', { ignore: 'html' }).catch(() => undefined);
    expect(screen.queryByText(en.session.live.badge)).toBeNull();
  });

  it('shows the badge and elapsed time and navigates on open', async () => {
    liveNow = live(new Date(Date.now() - 95 * 60_000).toISOString());
    render(wrap(<LiveSessionBanner />));

    expect(await screen.findByText(en.session.live.badge)).toBeTruthy();
    expect(screen.getByText('1h 35m')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: en.session.live.openButton }));
    expect(push).toHaveBeenCalledWith('/sessions/edit?id=5');
  });

  it('ticks the elapsed time forward', async () => {
    vi.useFakeTimers();
    liveNow = live(new Date(Date.now() - 10 * 60_000).toISOString());
    render(wrap(<LiveSessionBanner />));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText('10m')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(2 * 60_000);
    });
    expect(screen.getByText('12m')).toBeTruthy();
    vi.useRealTimers();
  });

  it('start() stores the created session in the query cache', async () => {
    const started = capture('post', api('/toys/sessions/start/'), () => wire(live(new Date().toISOString())));
    render(wrap(<StartProbe />));
    const probe = await screen.findByText('idle');
    fireEvent.click(probe);
    expect(await screen.findByText('live:5')).toBeTruthy();
    expect(started.urls).toHaveLength(1);
  });
});
