'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { isValidSort, type Sort, type SortConfig } from '@/lib/sort';

interface SortContextValue {
  sort: Sort | null;
  setSort: (sort: Sort | null) => void;
}

const SortContext = createContext<SortContextValue | null>(null);

const parseStoredSort = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export function SortProvider({ children, config }: Readonly<{ children: ReactNode; config: SortConfig }>) {
  const [sortState, setSortState] = useState<Sort | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(config.storageKey);
    if (!stored) return;
    const parsed = parseStoredSort(stored);
    if (isValidSort(parsed, config)) setSortState(parsed);
  }, [config]);

  const setSort = useCallback(
    (next: Sort | null) => {
      setSortState(next);
      if (next) localStorage.setItem(config.storageKey, JSON.stringify(next));
      else localStorage.removeItem(config.storageKey);
    },
    [config],
  );

  const value = useMemo(() => ({ sort: sortState, setSort }), [sortState, setSort]);

  return <SortContext.Provider value={value}>{children}</SortContext.Provider>;
}

export function useSort(): SortContextValue {
  const ctx = useContext(SortContext);
  if (!ctx) throw new Error('useSort must be used within SortProvider');
  return ctx;
}
