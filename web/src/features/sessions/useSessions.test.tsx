// @vitest-environment happy-dom

import type { QueryClient } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useNavigation', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/hooks/useNavigation')>();
  const { testNavigation } = await import('@/test/navigation');
  return { ...original, useNavigation: () => testNavigation() };
});

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  fetchSessions: vi.fn(),
  fetchSession: vi.fn(),
  fetchToys: vi.fn(),
  createSession: vi.fn(),
  updateSession: vi.fn(),
  patchSessionStart: vi.fn(),
  deleteSession: vi.fn(),
}));

import {
  createSession,
  deleteSession,
  fetchSession,
  fetchSessions,
  fetchToys,
  patchSessionStart,
  updateSession,
  type SessionPage,
} from '@/api';
import type { Session } from '@/api/types';
import { currentPeriod, periodRange } from '@/features/sessions/session';
import { SESSION_SORT } from '@/features/sessions/sessionSort';
import { makeSession, makeToy } from '@/test/fixtures';
import { navState, resetNavigation } from '@/test/navigation';
import { settle } from '@/test/wait';
import { createTestQueryClient } from '@/test/QueryWrapper';
import { appWrapper } from '@/test/render';
import { type SessionPayload, useSaveSession, useSession, useSessions } from '@/features/sessions/useSessions';

const payload: SessionPayload = { startedAt: '2026-08-21T10:00:00Z', endedAt: null, entries: [] };

const page = (sessions: Session[], overrides: Partial<{ count: number; hasMore: boolean }> = {}): SessionPage => ({
  sessions,
  count: overrides.count ?? sessions.length,
  hasMore: overrides.hasMore ?? false,
});

type SessionQuery = Parameters<typeof fetchSessions>[0];
let respondSessions: (query: SessionQuery) => SessionPage;
const sessionQueries: NonNullable<SessionQuery>[] = [];

const renderAppHook = <T,>(hook: () => T, client: QueryClient = createTestQueryClient()) =>
  renderHook(hook, { wrapper: appWrapper(client, { sort: SESSION_SORT }) });

describe('session hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetNavigation();
    navState.pathname = '/sessions';
    localStorage.clear();
    sessionQueries.length = 0;
    respondSessions = () => page([makeSession({ id: 1 }), makeSession({ id: 2 })]);
    vi.mocked(fetchSessions).mockImplementation(async (query = {}) => {
      sessionQueries.push(query);
      return respondSessions(query);
    });
    vi.mocked(fetchToys).mockResolvedValue([makeToy({ id: 1, name: 'Steel' })]);
  });

  it('loads and merges the session pages with the server count', async () => {
    respondSessions = () => page([makeSession({ id: 1 })], { count: 41, hasMore: true });
    const { result } = renderAppHook(useSessions);
    await settle(() => expect(result.current.sessions.map((s) => s.id)).toEqual([1]));
    expect(result.current.sessionCount).toBe(41);
    expect(result.current.hasMore).toBe(true);
  });

  it('appends the next page without duplicating overlapping sessions', async () => {
    respondSessions = (query) =>
      query?.page === 2
        ? page([makeSession({ id: 2 }), makeSession({ id: 3 })], { count: 3 })
        : page([makeSession({ id: 1 }), makeSession({ id: 2 })], { count: 3, hasMore: true });
    const { result } = renderAppHook(useSessions);
    await settle(() => expect(result.current.sessions).toHaveLength(2));

    act(() => result.current.loadMore());
    await settle(() => expect(result.current.sessions.map((s) => s.id)).toEqual([1, 2, 3]));
    expect(sessionQueries.map((q) => q.page)).toContain(2);
  });

  it('refetches with the selected period window and resets to the first page', async () => {
    const { result, rerender } = renderAppHook(useSessions);
    await settle(() => expect(result.current.sessions).toHaveLength(2));

    const week = currentPeriod('week');
    act(() => result.current.setPeriod(week));
    rerender();
    await settle(() => {
      const last = sessionQueries[sessionQueries.length - 1];
      expect(last.start).toBe(periodRange(week).start);
      expect(last.end).toBe(periodRange(week).end);
      expect(last.page).toBe(1);
    });
  });

  it('seeds the toy filter from the url and refetches when filters change', async () => {
    navState.search = 'toys=1';
    const { result } = renderAppHook(useSessions);
    await settle(() => expect(sessionQueries[0]?.filters?.toyIds).toEqual([1]));

    act(() => result.current.setSessionFilters({ ...result.current.sessionFilters, hasMedia: true }));
    await settle(() => {
      const last = sessionQueries[sessionQueries.length - 1];
      expect(last.filters?.hasMedia).toBe(true);
    });
  });

  it('refetches when the session data is invalidated', async () => {
    const client = createTestQueryClient();
    const { result } = renderAppHook(useSessions, client);
    await settle(() => expect(result.current.sessions).toHaveLength(2));

    respondSessions = () => page([makeSession({ id: 1 }), makeSession({ id: 2 }), makeSession({ id: 3 })]);
    act(() => result.current.reload());
    await settle(() => expect(result.current.sessions).toHaveLength(3));
  });

  it('prepends a freshly started session to the list', async () => {
    const { result } = renderAppHook(useSessions);
    await settle(() => expect(result.current.sessions).toHaveLength(2));

    act(() => result.current.prependSession(makeSession({ id: 9 })));
    await settle(() => expect(result.current.sessions[0].id).toBe(9));
    expect(result.current.sessionCount).toBe(3);
  });

  it('exposes the toys and the lookup map', async () => {
    const { result } = renderAppHook(useSessions);
    await settle(() => expect(result.current.toys.map((t) => t.name)).toEqual(['Steel']));
    expect(result.current.toysById.get(1)?.name).toBe('Steel');
  });

  it('loads the session detail without loading the session list', async () => {
    vi.mocked(fetchSession).mockResolvedValue(makeSession({ id: 5, isLive: true }));
    const { result } = renderAppHook(() => useSession(5));
    await settle(() => expect(result.current.session?.isLive).toBe(true));
    expect(fetchSession).toHaveBeenCalledWith(5);
    expect(fetchSessions).not.toHaveBeenCalled();
  });

  it('serves a listed session from its initial data without fetching', async () => {
    const listed = makeSession({ id: 5 });
    const { result } = renderAppHook(() => useSession(5, listed));
    expect(result.current.session).toEqual(listed);
    await act(async () => undefined);
    expect(fetchSession).not.toHaveBeenCalled();
    expect(fetchSessions).not.toHaveBeenCalled();
  });

  it('does not fetch a detail without an id', async () => {
    const { result } = renderAppHook(() => useSession(null));
    await act(async () => undefined);
    expect(fetchSession).not.toHaveBeenCalled();
    expect(result.current.session).toBeNull();
    expect(result.current.isSessionLoading).toBe(false);
  });

  it('creates when saving without a session id', async () => {
    vi.mocked(createSession).mockResolvedValue(makeSession({ id: 9 }));
    const { result } = renderAppHook(useSaveSession);
    await act(async () => {
      await expect(result.current.saveSession({ sessionId: null, liveStartOnly: false, payload })).resolves.toEqual(
        makeSession({ id: 9 }),
      );
    });
    expect(vi.mocked(createSession).mock.calls[0][0]).toEqual(payload);
    expect(updateSession).not.toHaveBeenCalled();
  });

  it('patches only the start time for a live start-only save', async () => {
    vi.mocked(patchSessionStart).mockResolvedValue(makeSession({ id: 5 }));
    const { result } = renderAppHook(useSaveSession);
    await act(async () => {
      await result.current.saveSession({ sessionId: 5, liveStartOnly: true, payload });
    });
    expect(vi.mocked(patchSessionStart).mock.calls[0].slice(0, 2)).toEqual([5, payload.startedAt]);
    expect(updateSession).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });

  it('updates the full session otherwise and invalidates its data', async () => {
    vi.mocked(updateSession).mockResolvedValue(makeSession({ id: 5 }));
    const client = createTestQueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderAppHook(useSaveSession, client);
    await act(async () => {
      await result.current.saveSession({ sessionId: 5, liveStartOnly: false, payload });
    });
    expect(vi.mocked(updateSession).mock.calls[0].slice(0, 2)).toEqual([5, payload]);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['sessions', 'detail', 5] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['sessions', 'list'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['sessions', 'stats'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['toys'] });
  });

  it('removes a session and refreshes session data', async () => {
    vi.mocked(deleteSession).mockResolvedValue(undefined as never);
    const client = createTestQueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderAppHook(useSessions, client);
    await act(async () => {
      await result.current.removeSession(4);
    });
    expect(vi.mocked(deleteSession).mock.calls[0][0]).toBe(4);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['sessions', 'live'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['toys'] });
  });
});
