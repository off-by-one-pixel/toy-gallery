'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

import { DEFAULT_THEME, isTheme, type Theme, THEMES } from '../themes/registry';

const STORAGE_KEY = 'theme';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    const stored = globalThis.window !== undefined ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored && isTheme(stored)) setThemeState(stored);
  }, []);

  useEffect(() => {
    if (globalThis.window === undefined) return;
    document.documentElement.dataset.theme = theme;
    const color = THEMES[theme].browserChrome;
    const meta = document.querySelector('meta[name="theme-color"]:not([media])');
    if (meta) {
      meta.setAttribute('content', color);
    } else {
      const created = document.createElement('meta');
      created.setAttribute('name', 'theme-color');
      created.setAttribute('content', color);
      document.head.appendChild(created);
    }
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    if (globalThis.window !== undefined) localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be used within ThemeProvider');
  return ctx;
}
