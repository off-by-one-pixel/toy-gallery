'use client';

import { useEffect, useMemo } from 'react';

import { type InfiniteData, useQueryClient } from '@tanstack/react-query';

import { useTranslations } from 'next-intl';

import { useApiInfiniteQuery, useApiMutation, useApiQuery, useReportError } from '@/hooks/useApi';
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
import type { Session, Toy } from '@/api/types';

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

export type SessionsOptions = Readonly<{
  sessionId?: number | null;
  sessionInitial?: Session;
}>;

export type SessionsData = Readonly<{
  session: Session | null;
  isSessionLoading: boolean;
  sessionError: string | null;

  sessionCount: number;
  sessions: Session[];
  toysById: Map<number, Toy>;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMore: () => void;
  prependSession: (session: Session) => void;
  reload: () => void;

  period: Period;
  setPeriod: (next: Period) => void;

  toys: Toy[];
  sessionFilters: SessionFilters;
  setSessionFilters: (next: SessionFilters) => void;

  isLoading: boolean;
  error: string | null;

  saveSession: (args: SaveSessionArgs) => Promise<Session | undefined>;
  isSavingSession: boolean;
  removeSession: (id: number) => Promise<unknown>;
  isRemovingSession: boolean;
}>;

export function useSessions(options: SessionsOptions = {}): SessionsData {
  const t = useTranslations('session');
  const detailId = options.sessionId ?? null;
  const detail = useApiQuery({
    key: queryKeys.sessions.detail(detailId ?? 0),
    fn: () => fetchSession(detailId ?? 0),
    enabled: detailId !== null,
    initialData: options.sessionInitial,
  });
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
  const reportError = useReportError();

  const queryState = { period, sort, filters: sessionFilters };
  const listKey = sessionListKey(queryState);

  const list = useApiInfiniteQuery({
    key: listKey,
    fn: (page) => fetchSessions(sessionListQuery(queryState, page)),
    getNextPage: (lastPage: SessionPage, pages: SessionPage[]) => (lastPage.hasMore ? pages.length + 1 : undefined),
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

  const save = useApiMutation({
    fn: persistSession,
    success: () => t('savedToast'),
    invalidates: (saved) => [queryKeys.sessions.detail(saved.id), ...sessionDataKeys],
  });

  const removal = useApiMutation({
    fn: deleteSession,
    onSettled: () => invalidateSessionData(queryClient),
  });

  const listError = list.data ? null : list.errorMessage;

  return {
    session: detail.data ?? null,
    isSessionLoading: detailId !== null && detail.isPending,
    sessionError: detail.errorMessage,
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
    saveSession: save.run,
    isSavingSession: save.isPending,
    removeSession: removal.run,
    isRemovingSession: removal.isPending,
  };
}
