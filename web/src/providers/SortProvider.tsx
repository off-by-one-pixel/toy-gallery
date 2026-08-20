'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { isValidSort, type Sort, type SortConfig } from '../services/sort';

interface SortContextValue {
  sort: Sort | null;
  setSort: (sort: Sort | null) => void;
}

const SortContext = createContext<SortContextValue | null>(null);

export function SortProvider({ children, config }: Readonly<{ children: ReactNode; config: SortConfig }>) {
  const { storageKey } = config;
  const [sortState, setSortState] = useState<Sort | null>(null);

  useEffect(() => {
    if (globalThis.window === undefined) return;
    const stored = localStorage.getItem(storageKey);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (isValidSort(parsed, config)) setSortState(parsed);
    } catch {
      // ignore corrupt value
    }
  }, [storageKey, config]);

  const setSort = useCallback(
    (next: Sort | null) => {
      setSortState(next);
      if (globalThis.window === undefined) return;
      if (next) localStorage.setItem(storageKey, JSON.stringify(next));
      else localStorage.removeItem(storageKey);
    },
    [storageKey],
  );

  const value = useMemo(() => ({ sort: sortState, setSort }), [sortState, setSort]);

  return <SortContext.Provider value={value}>{children}</SortContext.Provider>;
}

export function useSort(): SortContextValue {
  const ctx = useContext(SortContext);
  if (!ctx) throw new Error('useSort must be used within SortProvider');
  return ctx;
}
