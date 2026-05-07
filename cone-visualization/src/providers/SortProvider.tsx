'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { isSortColumn, type Sort } from '../services/sort';

const STORAGE_KEY = 'gallery.sort';

interface SortContextValue {
  sort: Sort | null;
  setSort: (sort: Sort | null) => void;
}

const SortContext = createContext<SortContextValue | null>(null);

const isValidSort = (v: unknown): v is Sort => {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as { column?: unknown; direction?: unknown };
  return isSortColumn(s.column) && (s.direction === 'asc' || s.direction === 'desc');
};

export function SortProvider({ children }: { children: ReactNode }) {
  const [sort, setSortState] = useState<Sort | null>(null);

  useEffect(() => {
    if (typeof globalThis.window === 'undefined') return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (isValidSort(parsed)) setSortState(parsed);
    } catch {
      // ignore corrupt value
    }
  }, []);

  const setSort = useCallback((next: Sort | null) => {
    setSortState(next);
    if (typeof globalThis.window === 'undefined') return;
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  return <SortContext.Provider value={{ sort, setSort }}>{children}</SortContext.Provider>;
}

export function useSort(): SortContextValue {
  const ctx = useContext(SortContext);
  if (!ctx) throw new Error('useSort must be used within SortProvider');
  return ctx;
}
