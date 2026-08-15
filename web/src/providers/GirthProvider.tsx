'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

import { DEFAULT_GIRTH, type Girth, isGirth } from '../services/girth';

const STORAGE_KEY = 'girth';

interface GirthContextValue {
  girth: Girth;
  setGirth: (girth: Girth) => void;
}

const GirthContext = createContext<GirthContextValue | null>(null);

export function GirthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [storedGirth, setStoredGirth] = useState<Girth>(DEFAULT_GIRTH);

  useEffect(() => {
    const stored = globalThis.window !== undefined ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored && isGirth(stored)) setStoredGirth(stored);
  }, []);

  const setGirth = useCallback((next: Girth) => {
    setStoredGirth(next);
    if (globalThis.window !== undefined) localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo(() => ({ girth: storedGirth, setGirth }), [storedGirth, setGirth]);

  return <GirthContext.Provider value={value}>{children}</GirthContext.Provider>;
}

export function useGirth(): GirthContextValue {
  const ctx = useContext(GirthContext);
  if (!ctx) throw new Error('useGirth must be used within GirthProvider');
  return ctx;
}
