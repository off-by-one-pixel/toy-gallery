'use client';

import { useEffect, useMemo, useState } from 'react';

import { type InfiniteData, useQueryClient } from '@tanstack/react-query';

import { useSearchParams } from 'next/navigation';

import { useApiInfiniteQuery, useApiQuery, useReportError } from '@/hooks/useApi';
import { useUrlUpdate } from '@/hooks/useUrlNav';
import { useSortOf } from '@/hooks/useSortOf';
import { fetchSessions, fetchToys, type SessionPage } from '@/api';
import { invalidateSessionData, queryKeys } from '@/api/queryKeys';
import { sessionListKey, sessionListQuery } from '@/features/sessions/list/sessionQuery';
import {
  type FilterKey,
  mergeSessions,
  parseSessionFilters,
  type SessionFilters,
  sessionFiltersUrlParams,
  toysById as buildToysById,
} from '@/features/sessions/session';
import { SESSION_SORT } from '@/features/sessions/sessionSort';
import type { Session, Toy } from '@/api/types';

export type SessionListData = Readonly<{
  sessionCount: number;
  sessions: Session[];
  toysById: Map<number, Toy>;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMore: () => void;
  prependSession: (session: Session) => void;
  reload: () => void;

  filter: FilterKey;
  setFilter: (next: FilterKey) => void;

  toys: Toy[];
  sessionFilters: SessionFilters;
  setSessionFilters: (next: SessionFilters) => void;

  isLoading: boolean;
  error: string | null;
}>;

export function useSessionList(): SessionListData {
  const searchParams = useSearchParams();
  const updateUrl = useUrlUpdate();
  const [filter, setFilter] = useState<FilterKey>('all');
  const sessionFilters = useMemo<SessionFilters>(
    () => parseSessionFilters((name) => searchParams.get(name)),
    [searchParams],
  );
  const setSessionFilters = (next: SessionFilters) => {
    updateUrl(sessionFiltersUrlParams(next));
  };
  const { sort } = useSortOf(SESSION_SORT);
  const queryClient = useQueryClient();
  const reportError = useReportError();

  const queryState = { filter, sort, filters: sessionFilters };
  const listKey = sessionListKey(queryState);

  const list = useApiInfiniteQuery({
    key: listKey,
    fn: (page) => fetchSessions(sessionListQuery(queryState, page)),
    getNextPage: (lastPage: SessionPage, pages: SessionPage[]) => (lastPage.hasMore ? pages.length + 1 : undefined),
  });

  const { data: loadedToys, errorMessage: toysError } = useApiQuery({ key: queryKeys.toys.all, fn: fetchToys });

  const sessions = useMemo(
    () => (list.data?.pages ?? []).reduce<Session[]>((acc, page) => mergeSessions(acc, page.sessions), []),
    [list.data],
  );
  const toysById = useMemo(() => buildToysById(loadedToys ?? []), [loadedToys]);

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

  const listError = list.data ? null : list.errorMessage;

  return {
    sessionCount: list.data?.pages.at(-1)?.count ?? 0,
    sessions,
    toysById,
    hasMore: list.hasNextPage,
    isLoadingMore: list.isFetchingNextPage,
    loadMore,
    prependSession,
    reload,
    filter,
    setFilter,
    toys: loadedToys ?? [],
    sessionFilters,
    setSessionFilters,
    isLoading: list.isPending,
    error: listError ?? toysError,
  };
}
