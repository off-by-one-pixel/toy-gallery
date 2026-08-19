'use client';

import { useEffect, useMemo, useState } from 'react';

import { useAsyncAction } from '../../hooks/useAsyncAction';
import {
  fetchMediaIndicators,
  fetchToys,
  fetchSessions,
  MEDIA_INDICATORS_CHANGED_EVENT,
  type MediaIndicators,
  notifySessionsChanged,
} from '../../services/api';
import { type FilterKey, filterSessions, toysById as buildToysById } from '../../services/session';
import type { Session, Toy } from '../../services/types';

export type SessionListData = Readonly<{
  /** Raw session count, used for chrome subtitle + empty-state copy. */
  sessionCount: number;
  /** Sessions after applying the current filter, ready to render. */
  visibleSessions: Session[];
  /** id → toy map for resolving entry.toy references. */
  toysById: Map<number, Toy>;
  mediaSessionIds: Set<number>;
  prependSession: (session: Session) => void;
  reload: () => void;

  filter: FilterKey;
  setFilter: (next: FilterKey) => void;

  isLoading: boolean;
  error: string | null;
}>;

/** Loads sessions + toys in parallel and exposes everything the
 *  SessionList page needs to render: filtered session list, toy
 *  lookup, filter state. The page is a dumb composition over this
 *  facade. */
export function useSessionList(): SessionListData {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [toys, setToys] = useState<Toy[]>([]);
  const [media, setMedia] = useState<MediaIndicators>(() => ({ configured: false, sessionIds: new Set() }));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [loadCount, setLoadCount] = useState(0);

  const runInline = useAsyncAction(setError);

  useEffect(() => {
    const onIndicatorsChanged = () => setLoadCount((n) => n + 1);
    window.addEventListener(MEDIA_INDICATORS_CHANGED_EVENT, onIndicatorsChanged);
    return () => window.removeEventListener(MEDIA_INDICATORS_CHANGED_EVENT, onIndicatorsChanged);
  }, []);

  useEffect(() => {
    let cancelled = false;
    runInline(
      async () => {
        const [s, t, m] = await Promise.all([
          fetchSessions(),
          fetchToys(),
          fetchMediaIndicators().catch((): MediaIndicators => ({ configured: false, sessionIds: new Set() })),
        ]);
        return { sessions: s, toys: t, media: m };
      },
      {
        busy: setIsLoading,
        onSuccess: (loaded) => {
          if (cancelled) return;
          setSessions(loaded.sessions);
          setToys(loaded.toys);
          setMedia(loaded.media);
          setError(null);
        },
      },
    );
    return () => {
      cancelled = true;
    };
  }, [runInline, loadCount]);

  const toysById = useMemo(() => buildToysById(toys), [toys]);
  const visibleSessions = useMemo(() => filterSessions(sessions, filter), [sessions, filter]);

  return {
    sessionCount: sessions.length,
    visibleSessions,
    toysById,
    mediaSessionIds: media.sessionIds,
    prependSession: (session: Session) => {
      setSessions((prev) => [session, ...prev]);
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
