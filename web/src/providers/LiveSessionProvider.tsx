'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { fetchLiveSession, startLiveSession } from '../services/api';
import type { Session } from '../services/types';

interface LiveSessionContextValue {
  liveSession: Session | null;
  isLoaded: boolean;
  start: () => Promise<Session>;
  refresh: () => Promise<void>;
}

const LiveSessionContext = createContext<LiveSessionContextValue | null>(null);

export function LiveSessionProvider({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const [liveSession, setLiveSession] = useState<Session | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setLiveSession(await fetchLiveSession());
    } catch {
      setLiveSession(null);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  const start = useCallback(async () => {
    const session = await startLiveSession();
    setLiveSession(session);
    return session;
  }, []);

  const value = useMemo(() => ({ liveSession, isLoaded, start, refresh }), [liveSession, isLoaded, start, refresh]);

  return <LiveSessionContext.Provider value={value}>{children}</LiveSessionContext.Provider>;
}

export function useLiveSession(): LiveSessionContextValue {
  const ctx = useContext(LiveSessionContext);
  if (!ctx) throw new Error('useLiveSession must be used within LiveSessionProvider');
  return ctx;
}
