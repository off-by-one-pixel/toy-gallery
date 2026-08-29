'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

interface TopBarContextValue {
  subtitle: string | null;
  setSubtitle: (next: string | null) => void;
}

const TopBarContext = createContext<TopBarContextValue | null>(null);

export function TopBarProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [subtitle, setSubtitle] = useState<string | null>(null);
  const value = useMemo(() => ({ subtitle, setSubtitle }), [subtitle]);
  return <TopBarContext.Provider value={value}>{children}</TopBarContext.Provider>;
}

export function useTopBarSubtitle(): string | null {
  return useContext(TopBarContext)?.subtitle ?? null;
}

export function useSetTopBarSubtitle(subtitle: string | null): void {
  const setSubtitle = useContext(TopBarContext)?.setSubtitle;
  useEffect(() => {
    if (!setSubtitle) return;
    setSubtitle(subtitle);
    return () => setSubtitle(null);
  }, [setSubtitle, subtitle]);
}
