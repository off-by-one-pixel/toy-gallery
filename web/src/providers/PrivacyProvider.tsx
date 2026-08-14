'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

const STORAGE_KEY = 'hideSensitive';

interface PrivacyContextValue {
  hideSensitive: boolean;
  toggleHideSensitive: () => void;
}

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

export function PrivacyProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [hideSensitive, setHideSensitive] = useState(false);

  useEffect(() => {
    const stored = globalThis.window !== undefined ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored === '1') setHideSensitive(true);
  }, []);

  const toggleHideSensitive = useCallback(() => {
    setHideSensitive((current) => {
      const next = !current;
      if (globalThis.window !== undefined) localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  }, []);

  const value = useMemo(() => ({ hideSensitive, toggleHideSensitive }), [hideSensitive, toggleHideSensitive]);

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

export function usePrivacy(): PrivacyContextValue {
  const ctx = useContext(PrivacyContext);
  if (!ctx) throw new Error('usePrivacy must be used within PrivacyProvider');
  return ctx;
}
