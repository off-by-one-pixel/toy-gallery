'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';

export const ViewMode = {
  cards: 'cards',
  list: 'list',
} as const;
export type ViewMode = (typeof ViewMode)[keyof typeof ViewMode];

const STORAGE_KEY = 'gallery.view';

interface ViewModeContextValue {
  view: ViewMode;
  setView: (view: ViewMode) => void;
}

const ViewModeContext = createContext<ViewModeContextValue | null>(null);

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [view, setViewState] = useState<ViewMode>(ViewMode.cards);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored === ViewMode.cards || stored === ViewMode.list) setViewState(stored);
  }, []);

  const setView = useCallback((next: ViewMode) => {
    setViewState(next);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, next);
  }, []);

  return <ViewModeContext.Provider value={{ view, setView }}>{children}</ViewModeContext.Provider>;
}

export function useViewMode(): ViewModeContextValue {
  const ctx = useContext(ViewModeContext);
  if (!ctx) throw new Error('useViewMode must be used within ViewModeProvider');
  return ctx;
}
