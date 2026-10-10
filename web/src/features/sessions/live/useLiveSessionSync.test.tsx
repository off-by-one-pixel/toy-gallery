// @vitest-environment happy-dom

import type { QueryClient } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  fetchLiveSession: vi.fn(),
  startLiveSession: vi.fn(),
}));

import { startLiveSession } from '@/api';
import { queryKeys } from '@/api/queryKeys';
import { makeSession } from '@/test/fixtures';
import { LiveStartProbe, liveSessionState, stubLiveSession } from '@/test/liveSession';
import { createTestQueryClient } from '@/test/QueryWrapper';
import { withAppProviders } from '@/test/render';
import LiveSessionSyncSubscriber from './LiveSessionSyncSubscriber';
import { LIVE_SYNC_INTERVAL_MS } from './useLiveSession';

const live = (id: number) => makeSession({ id, isLive: true });

const renderSync = (client: QueryClient, extra?: React.ReactNode) =>
  render(
    withAppProviders(
      <>
        <LiveSessionSyncSubscriber />
        {extra}
      </>,
      { client },
    ),
  );

type InvalidateSpy = MockInstance<QueryClient['invalidateQueries']>;

const spyOnInvalidations = (client: QueryClient): InvalidateSpy => vi.spyOn(client, 'invalidateQueries');

const invalidations = (spy: InvalidateSpy, queryKey: readonly string[]): number =>
  spy.mock.calls.filter(([filters]) => filters?.queryKey === queryKey).length;

const tick = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(50);
  });
};

describe('useLiveSessionSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    liveSessionState.current = null;
    stubLiveSession();
  });

  it('polls and invalidates session history only on live-id transitions', async () => {
    vi.useFakeTimers();
    const client = createTestQueryClient();
    const spy = spyOnInvalidations(client);
    renderSync(client);
    await tick(0);
    expect(invalidations(spy, queryKeys.sessions.lists)).toBe(0);

    liveSessionState.current = live(5);
    await tick(LIVE_SYNC_INTERVAL_MS);
    expect(invalidations(spy, queryKeys.sessions.lists)).toBe(1);
    expect(invalidations(spy, queryKeys.sessions.stats)).toBe(1);
    expect(invalidations(spy, queryKeys.toys.all)).toBe(1);

    await tick(LIVE_SYNC_INTERVAL_MS);
    expect(invalidations(spy, queryKeys.sessions.lists)).toBe(1);

    liveSessionState.current = null;
    await tick(LIVE_SYNC_INTERVAL_MS);
    expect(invalidations(spy, queryKeys.sessions.lists)).toBe(2);
    expect(invalidations(spy, queryKeys.sessions.stats)).toBe(2);
    expect(invalidations(spy, queryKeys.toys.all)).toBe(2);
    expect(invalidations(spy, queryKeys.sessions.live)).toBe(0);
    vi.useRealTimers();
  });

  it('does not invalidate when a live session already exists on first load', async () => {
    vi.useFakeTimers();
    liveSessionState.current = live(7);
    const client = createTestQueryClient();
    const spy = spyOnInvalidations(client);
    renderSync(client);
    await tick(0);
    expect(invalidations(spy, queryKeys.sessions.lists)).toBe(0);
    expect(invalidations(spy, queryKeys.sessions.stats)).toBe(0);
    vi.useRealTimers();
  });

  it('start() stores the created session in the query cache', async () => {
    vi.mocked(startLiveSession).mockResolvedValue(live(5));
    render(withAppProviders(<LiveStartProbe />));
    const probe = await screen.findByText('idle');
    fireEvent.click(probe);
    expect(await screen.findByText('live:5')).toBeTruthy();
    expect(startLiveSession).toHaveBeenCalledTimes(1);
  });

  it('runs one invalidation cycle when this device starts a session', async () => {
    vi.mocked(startLiveSession).mockResolvedValue(live(9));
    const client = createTestQueryClient();
    const spy = spyOnInvalidations(client);
    renderSync(client, <LiveStartProbe />);
    fireEvent.click(await screen.findByText('idle'));
    await waitFor(() => expect(invalidations(spy, queryKeys.sessions.lists)).toBe(1));
    expect(invalidations(spy, queryKeys.sessions.stats)).toBe(1);
    expect(startLiveSession).toHaveBeenCalledTimes(1);
  });
});
