'use client';

import { useEffect, useMemo } from 'react';

import { type InfiniteData, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

import { useTranslations } from 'next-intl';

import { useApiMutation, useApiQuery, useReportError } from '@/hooks/useApi';
import { useNavigation } from '@/hooks/useNavigation';
import { useSortOf } from '@/hooks/useSortOf';
import {
  createSession,
  deleteSession,
  fetchSession,
  fetchSessions,
  patchSessionStart,
  updateSession,
  type SessionPage,
} from '@/api';
import { formatError } from '@/api/errors';
import { invalidateSessionData, queryKeys, sessionDataKeys } from '@/api/queryKeys';
import { sessionListKey, sessionListQuery } from '@/features/sessions/list/sessionQuery';
import {
  mergeSessions,
  parsePeriodParam,
  type Period,
  periodUrlParam,
  parseSessionFilters,
  type SessionFilters,
  sessionFiltersUrlParams,
  toysById as buildToysById,
} from '@/features/sessions/session';
import { SESSION_SORT } from '@/features/sessions/sessionSort';
import { useToys } from '@/features/toys/useToys';
import type { Session } from '@/api/types';

export type SessionPayload = Parameters<typeof createSession>[0];

export type SaveSessionArgs = Readonly<{
  sessionId: number | null;
  liveStartOnly: boolean;
  payload: SessionPayload;
}>;

const persistSession = ({ sessionId, liveStartOnly, payload }: SaveSessionArgs): Promise<Session> => {
  if (sessionId === null) return createSession(payload);
  if (liveStartOnly) return patchSessionStart(sessionId, payload.startedAt);
  return updateSession(sessionId, payload);
};

export function useSession(sessionId: number | null, initial?: Session) {
  const detail = useApiQuery({
    key: queryKeys.sessions.detail(sessionId ?? 0),
    fn: () => fetchSession(sessionId ?? 0),
    enabled: sessionId !== null,
    initialData: initial,
  });
  return {
    session: detail.data ?? null,
    isSessionLoading: sessionId !== null && detail.isPending,
    sessionError: detail.errorMessage,
  };
}

export function useSaveSession() {
  const t = useTranslations('session');
  const save = useApiMutation({
    fn: persistSession,
    success: () => t('savedToast'),
    invalidates: (saved) => [queryKeys.sessions.detail(saved.id), ...sessionDataKeys],
  });
  return { saveSession: save.run, isSavingSession: save.isPending };
}

export function useSessions() {
  const { searchParams, updateParams } = useNavigation();
  const period = useMemo<Period>(() => parsePeriodParam(searchParams.get('period')), [searchParams]);
  const setPeriod = (next: Period) => {
    updateParams({ period: periodUrlParam(next) }, { replace: true });
  };
  const sessionFilters = useMemo<SessionFilters>(
    () => parseSessionFilters((name) => searchParams.get(name)),
    [searchParams],
  );
  const setSessionFilters = (next: SessionFilters) => {
    updateParams(sessionFiltersUrlParams(next));
  };
  const { sort } = useSortOf(SESSION_SORT);
  const queryClient = useQueryClient();
  const t = useTranslations('errors');
  const reportError = useReportError();

  const queryState = { period, sort, filters: sessionFilters };
  const listKey = sessionListKey(queryState);

  const list = useInfiniteQuery({
    queryKey: listKey,
    queryFn: ({ pageParam }) => fetchSessions(sessionListQuery(queryState, pageParam)),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => (lastPage.hasMore ? pages.length + 1 : undefined),
  });

  const { toys: loadedToys, error: toysError } = useToys();

  const sessions = useMemo(
    () => (list.data?.pages ?? []).reduce<Session[]>((acc, page) => mergeSessions(acc, page.sessions), []),
    [list.data],
  );
  const toysById = useMemo(() => buildToysById(loadedToys), [loadedToys]);

  useEffect(() => {
    for (const session of sessions) {
      queryClient.setQueryData(queryKeys.sessions.detail(session.id), session);
    }
  }, [sessions, queryClient]);

  const loadMore = () => {
    if (!list.hasNextPage || list.isFetchingNextPage) return;
    void list.fetchNextPage().then((result) => {
      if (result.error) reportError(result.error);
    });
  };

  const prependSession = (session: Session) => {
    queryClient.setQueryData<InfiniteData<SessionPage>>(
      listKey,
      (data) =>
        data && {
          ...data,
          pages: data.pages.map((page, index) => ({
            ...page,
            count: page.count + 1,
            sessions: index === 0 ? mergeSessions([session], page.sessions) : page.sessions,
          })),
        },
    );
  };

  const reload = () => {
    invalidateSessionData(queryClient);
  };

  const removal = useApiMutation({
    fn: deleteSession,
    onSettled: () => invalidateSessionData(queryClient),
  });

  const listError = list.error && !list.data ? formatError(list.error, t) : null;

  return {
    sessionCount: list.data?.pages.at(-1)?.count ?? 0,
    sessions,
    toysById,
    hasMore: list.hasNextPage,
    isLoadingMore: list.isFetchingNextPage,
    loadMore,
    prependSession,
    reload,
    period,
    setPeriod,
    toys: loadedToys,
    sessionFilters,
    setSessionFilters,
    isLoading: list.isPending,
    error: listError ?? toysError,
    removeSession: removal.run,
    isRemovingSession: removal.isPending,
  };
}
