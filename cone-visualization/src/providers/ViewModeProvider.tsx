'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

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

export function ViewModeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [viewState, setViewState] = useState<ViewMode>(ViewMode.cards);

  useEffect(() => {
    const stored = globalThis.window !== undefined ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored === ViewMode.cards || stored === ViewMode.list) setViewState(stored);
  }, []);

  const setView = useCallback((next: ViewMode) => {
    setViewState(next);
    if (globalThis.window !== undefined) localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo(() => ({ view: viewState, setView }), [viewState, setView]);

  return <ViewModeContext.Provider value={value}>{children}</ViewModeContext.Provider>;
}

export function useViewMode(): ViewModeContextValue {
  const ctx = useContext(ViewModeContext);
  if (!ctx) throw new Error('useViewMode must be used within ViewModeProvider');
  return ctx;
}
