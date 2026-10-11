'use client';

import { ReactNode, useEffect } from 'react';

import { DEFAULT_THEME, THEME_NAMES, type Theme, THEMES } from '@/features/preferences/themeRegistry';
import { oneOf, usePersistedState } from '@/hooks/usePersistedState';

const isTheme = oneOf(THEME_NAMES);

export function useThemeContext() {
  const [theme, setTheme] = usePersistedState<Theme>('theme', DEFAULT_THEME, isTheme);
  return { theme, setTheme };
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  const color = THEMES[theme].browserChrome;
  const meta = document.querySelector('meta[name="theme-color"]:not([media])');
  if (meta) {
    meta.setAttribute('content', color);
    return;
  }
  const created = document.createElement('meta');
  created.setAttribute('name', 'theme-color');
  created.setAttribute('content', color);
  document.head.appendChild(created);
}

export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { theme } = useThemeContext();
  useEffect(() => applyTheme(theme), [theme]);
  return <>{children}</>;
}
