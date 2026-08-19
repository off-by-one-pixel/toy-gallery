'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useSort } from '../../providers/SortProvider';
import {
  fetchMediaIndicators,
  fetchSessions,
  fetchToys,
  MEDIA_INDICATORS_CHANGED_EVENT,
  type MediaIndicators,
  notifySessionsChanged,
} from '../../services/api';
import {
  type FilterKey,
  filterStartDate,
  mergeSessions,
  sessionOrderingParam,
  type SessionSort,
  toysById as buildToysById,
} from '../../services/session';
import type { Session, Toy } from '../../services/types';

export type SessionListData = Readonly<{
  sessionCount: number;
  sessions: Session[];
  toysById: Map<number, Toy>;
  mediaSessionIds: Set<number>;
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

export function useSessionList(): SessionListData {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [toys, setToys] = useState<Toy[]>([]);
  const [media, setMedia] = useState<MediaIndicators>(() => ({ configured: false, sessionIds: new Set() }));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [loadCount, setLoadCount] = useState(0);
  const [mediaLoadCount, setMediaLoadCount] = useState(0);
  const generationRef = useRef(0);
  const { sort } = useSort();

  const runInline = useAsyncAction(setError);
  const runToast = useAsyncAction();

  useEffect(() => {
    const onIndicatorsChanged = () => setMediaLoadCount((n) => n + 1);
    window.addEventListener(MEDIA_INDICATORS_CHANGED_EVENT, onIndicatorsChanged);
    return () => window.removeEventListener(MEDIA_INDICATORS_CHANGED_EVENT, onIndicatorsChanged);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchMediaIndicators()
      .then((indicators) => {
        if (!cancelled) setMedia(indicators);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [mediaLoadCount, loadCount]);

  const listQuery = useCallback(
    (pageNumber: number) =>
      fetchSessions({
        page: pageNumber,
        start: filterStartDate(filter),
        ordering: sessionOrderingParam(sort as SessionSort | null),
      }),
    [filter, sort],
  );

  useEffect(() => {
    let cancelled = false;
    generationRef.current += 1;
    runInline(
      async () => {
        const [firstPage, loadedToys] = await Promise.all([listQuery(1), fetchToys()]);
        return { firstPage, loadedToys };
      },
      {
        busy: setIsLoading,
        onSuccess: (loaded) => {
          if (cancelled) return;
          setSessions(loaded.firstPage.sessions);
          setCount(loaded.firstPage.count);
          setHasMore(loaded.firstPage.hasMore);
          setPage(1);
          setToys(loaded.loadedToys);
          setError(null);
        },
      },
    );
    return () => {
      cancelled = true;
    };
  }, [runInline, listQuery, loadCount]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || isLoading) return;
    const generation = generationRef.current;
    const nextPage = page + 1;
    void runToast(() => listQuery(nextPage), {
      busy: setIsLoadingMore,
      onSuccess: (loaded) => {
        if (generationRef.current !== generation) return;
        setSessions((prev) => mergeSessions(prev, loaded.sessions));
        setCount(loaded.count);
        setHasMore(loaded.hasMore);
        setPage(nextPage);
      },
    });
  }, [hasMore, isLoadingMore, isLoading, page, listQuery, runToast]);

  const toysById = useMemo(() => buildToysById(toys), [toys]);

  return {
    sessionCount: count,
    sessions,
    toysById,
    mediaSessionIds: media.sessionIds,
    hasMore,
    isLoadingMore,
    loadMore,
    prependSession: (session: Session) => {
      setSessions((prev) => mergeSessions([session], prev));
      setCount((c) => c + 1);
      notifySessionsChanged();
    },
    reload: () => {
      setLoadCount((n) => n + 1);
      notifySessionsChanged();
    },
    filter,
    setFilter,
    isLoading,
    error,
  };
}
