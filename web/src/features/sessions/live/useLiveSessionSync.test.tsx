// @vitest-environment jsdom

import type { QueryClient } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';

import { queryKeys } from '@/api/queryKeys';
import type { Session } from '@/api/types';
import { api, capture, http, HttpResponse, liveWire, server, wire } from '@/test/msw';
import { createTestQueryClient, QueryWrapper } from '@/test/QueryWrapper';
import LiveSessionSyncSubscriber from './LiveSessionSyncSubscriber';
import { LIVE_SYNC_INTERVAL_MS, useLiveSession } from './useLiveSession';

const live = (id: number): Session => ({
  id,
  startedAt: '2026-08-21T10:00:00Z',
  isLive: true,
  entries: [],
  records: [],
  totalToyDurationMinutes: null,
  maxInsertableLength: null,
  maxCircumference: null,
});

let liveNow: Session | null = null;

const useLiveState = () =>
  server.use(http.get(api('/toys/sessions/live/'), () => HttpResponse.json(liveWire(liveNow))));

function StartProbe() {
  const { start, isLoaded } = useLiveSession();
  return (
    <button type="button" onClick={() => void start()}>
      {isLoaded ? 'start' : 'loading'}
    </button>
  );
}

const renderSync = (client: QueryClient, extra?: React.ReactNode) =>
  render(
    <QueryWrapper client={client}>
      <LiveSessionSyncSubscriber />
      {extra}
    </QueryWrapper>,
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
    liveNow = null;
    useLiveState();
  });

  it('polls and invalidates lists and stats only on live-id transitions', async () => {
    vi.useFakeTimers();
    const client = createTestQueryClient();
    const spy = spyOnInvalidations(client);
    renderSync(client);
    await tick(0);
    expect(invalidations(spy, queryKeys.sessions.lists)).toBe(0);

    liveNow = live(5);
    await tick(LIVE_SYNC_INTERVAL_MS);
    expect(invalidations(spy, queryKeys.sessions.lists)).toBe(1);
    expect(invalidations(spy, queryKeys.sessions.stats)).toBe(1);

    await tick(LIVE_SYNC_INTERVAL_MS);
    expect(invalidations(spy, queryKeys.sessions.lists)).toBe(1);

    liveNow = null;
    await tick(LIVE_SYNC_INTERVAL_MS);
    expect(invalidations(spy, queryKeys.sessions.lists)).toBe(2);
    expect(invalidations(spy, queryKeys.sessions.stats)).toBe(2);
    vi.useRealTimers();
  });

  it('does not invalidate when a live session already exists on first load', async () => {
    vi.useFakeTimers();
    liveNow = live(7);
    const client = createTestQueryClient();
    const spy = spyOnInvalidations(client);
    renderSync(client);
    await tick(0);
    expect(invalidations(spy, queryKeys.sessions.lists)).toBe(0);
    expect(invalidations(spy, queryKeys.sessions.stats)).toBe(0);
    vi.useRealTimers();
  });

  it('runs one invalidation cycle when this device starts a session', async () => {
    const started = capture('post', api('/toys/sessions/start/'), () => wire(live(9)));
    const client = createTestQueryClient();
    const spy = spyOnInvalidations(client);
    renderSync(client, <StartProbe />);
    fireEvent.click(await screen.findByText('start'));
    await waitFor(() => expect(invalidations(spy, queryKeys.sessions.lists)).toBe(1));
    expect(invalidations(spy, queryKeys.sessions.stats)).toBe(1);
    expect(started.urls).toHaveLength(1);
  });
});
