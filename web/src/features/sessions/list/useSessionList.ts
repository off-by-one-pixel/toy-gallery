'use client';

import { useMemo, useState } from 'react';

import { type InfiniteData, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';

import { useReportError } from '@/hooks/useAsyncAction';
import { useSortOf } from '@/hooks/useSortOf';
import { fetchMediaIndicators, fetchSessions, fetchToys, type SessionPage } from '@/api';
import { formatError } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { type FilterKey, filterStartDate, mergeSessions, toysById as buildToysById } from '@/features/sessions/session';
import { SESSION_SORT, sessionOrderingParam } from '@/features/sessions/sessionSort';
import type { Session, Toy } from '@/api/types';

export type SessionListData = Readonly<{
  sessionCount: number;
  sessions: Session[];
  toysById: Map<number, Toy>;
  mediaSessionIds: ReadonlySet<number>;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMore: () => void;
  prependSession: (session: Session) => void;
  reload: () => void;

  filter: FilterKey;
  setFilter: (next: FilterKey) => void;

  isLoading: boolean;
  error: string | null;
}>;

const NO_MEDIA_IDS: ReadonlySet<number> = new Set<number>();

export function useSessionList(): SessionListData {
  const [filter, setFilter] = useState<FilterKey>('all');
  const { sort } = useSortOf(SESSION_SORT);
  const queryClient = useQueryClient();
  const reportError = useReportError();

  const ordering = sessionOrderingParam(sort);
  const listKey = queryKeys.sessions.list(filter, ordering);

  const list = useInfiniteQuery({
    queryKey: listKey,
    queryFn: ({ pageParam }) => fetchSessions({ page: pageParam, start: filterStartDate(filter), ordering }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: SessionPage, pages: SessionPage[]) =>
      lastPage.hasMore ? pages.length + 1 : undefined,
  });

  const { data: indicators } = useQuery({ queryKey: queryKeys.media.indicators, queryFn: fetchMediaIndicators });
  const { data: loadedToys, error: toysError } = useQuery({ queryKey: queryKeys.toys.all, queryFn: fetchToys });

  const sessions = useMemo(
    () => (list.data?.pages ?? []).reduce<Session[]>((acc, page) => mergeSessions(acc, page.sessions), []),
    [list.data],
  );
  const toysById = useMemo(() => buildToysById(loadedToys ?? []), [loadedToys]);

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
    void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.stats });
  };

  const reload = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
  };

  const listError = list.data ? null : list.error;

  return {
    sessionCount: list.data?.pages.at(-1)?.count ?? 0,
    sessions,
    toysById,
    mediaSessionIds: indicators?.sessionIds ?? NO_MEDIA_IDS,
    hasMore: list.hasNextPage,
    isLoadingMore: list.isFetchingNextPage,
    loadMore,
    prependSession,
    reload,
    filter,
    setFilter,
    isLoading: list.isPending,
    error: (listError && formatError(listError)) ?? (toysError ? formatError(toysError) : null),
  };
}
