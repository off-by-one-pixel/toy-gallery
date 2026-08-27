// @vitest-environment jsdom

import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/',
}));

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  fetchLiveSession: vi.fn(),
  startLiveSession: vi.fn(),
}));

import en from '@/i18n/catalogs/en.json';
import { startLiveSession } from '@/api';
import { makeSession } from '@/test/fixtures';
import { LiveStartProbe, liveSessionState, stubLiveSession } from '@/test/liveSession';
import { withAppProviders } from '@/test/render';
import LiveSessionBanner from '@/features/sessions/live/LiveSessionBanner';

const live = (startedAt: string) => makeSession({ id: 5, startedAt, isLive: true });

describe('LiveSessionBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    liveSessionState.current = null;
    stubLiveSession();
  });

  it('renders nothing when no session is live', async () => {
    render(withAppProviders(<LiveSessionBanner />));
    await screen.findByText('idle', { ignore: 'html' }).catch(() => undefined);
    expect(screen.queryByText(en.session.live.badge)).toBeNull();
  });

  it('shows the badge and elapsed time and navigates on open', async () => {
    liveSessionState.current = live(new Date(Date.now() - 95 * 60_000).toISOString());
    render(withAppProviders(<LiveSessionBanner />));

    expect(await screen.findByText(en.session.live.badge)).toBeTruthy();
    expect(screen.getByText('1h 35m')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: en.session.live.openButton }));
    expect(push).toHaveBeenCalledWith('/sessions/edit?id=5');
  });

  it('ticks the elapsed time forward', async () => {
    vi.useFakeTimers();
    liveSessionState.current = live(new Date(Date.now() - 10 * 60_000).toISOString());
    render(withAppProviders(<LiveSessionBanner />));
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
    vi.mocked(startLiveSession).mockResolvedValue(live(new Date().toISOString()));
    render(withAppProviders(<LiveStartProbe />));
    const probe = await screen.findByText('idle');
    fireEvent.click(probe);
    expect(await screen.findByText('live:5')).toBeTruthy();
    expect(startLiveSession).toHaveBeenCalledTimes(1);
  });
});
