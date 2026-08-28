// @vitest-environment jsdom

import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/',
}));

const liveState = vi.hoisted(() => ({
  current: { liveSession: null, isLoaded: true, start: vi.fn() } as {
    liveSession: unknown;
    isLoaded: boolean;
    start: () => Promise<unknown>;
  },
}));

vi.mock('@/features/sessions/live/useLiveSession', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/sessions/live/useLiveSession')>()),
  useLiveSession: () => liveState.current,
}));

import en from '@/i18n/catalogs/en.json';
import { makeSession } from '@/test/fixtures';
import { withAppProviders } from '@/test/render';
import LiveSessionBanner from '@/features/sessions/live/LiveSessionBanner';

const live = (startedAt: string) => makeSession({ id: 5, startedAt, isLive: true });

describe('LiveSessionBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    liveState.current = { liveSession: null, isLoaded: true, start: vi.fn() };
  });

  it('renders nothing when no session is live', () => {
    render(withAppProviders(<LiveSessionBanner />));
    expect(screen.queryByText(en.session.live.badge)).toBeNull();
  });

  it('shows the badge and elapsed time and navigates on open', () => {
    liveState.current.liveSession = live(new Date(Date.now() - 95 * 60_000).toISOString());
    render(withAppProviders(<LiveSessionBanner />));

    expect(screen.getByText(en.session.live.badge)).toBeTruthy();
    expect(screen.getByText('1h 35m')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: en.session.live.openButton }));
    expect(push).toHaveBeenCalledWith('/sessions/edit?id=5');
  });

  it('ticks the elapsed time forward', () => {
    vi.useFakeTimers();
    liveState.current.liveSession = live(new Date(Date.now() - 10 * 60_000).toISOString());
    render(withAppProviders(<LiveSessionBanner />));
    expect(screen.getByText('10m')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(2 * 60_000);
    });
    expect(screen.getByText('12m')).toBeTruthy();
    vi.useRealTimers();
  });
});
