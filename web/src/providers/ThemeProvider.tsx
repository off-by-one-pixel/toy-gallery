'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

const STORAGE_KEY = 'theme';
const THEMES = ['light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];
const DEFAULT_THEME: Theme = 'light';

const isTheme = (value: string): value is Theme => (THEMES as readonly string[]).includes(value);

const THEME_COLOR: Record<Theme, string> = {
  light: '#f3f4f6',
  dark: '#35353a',
};

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
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
    const meta = document.querySelector('meta[name="theme-color"]:not([media])');
    if (meta) meta.setAttribute('content', THEME_COLOR[theme]);
    else {
      const created = document.createElement('meta');
      created.setAttribute('name', 'theme-color');
      created.setAttribute('content', THEME_COLOR[theme]);
      document.head.appendChild(created);
    }
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    if (globalThis.window !== undefined) localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: Theme = current === 'light' ? 'dark' : 'light';
      if (globalThis.window !== undefined) localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be used within ThemeProvider');
  return ctx;
}
