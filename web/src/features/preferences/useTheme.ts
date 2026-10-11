'use client';

import { DEFAULT_THEME, THEME_NAMES, type Theme, THEMES } from '@/features/preferences/themeRegistry';
import { oneOf, usePersistedState } from '@/hooks/usePersistedState';

const isTheme = oneOf(THEME_NAMES);

const applyTheme = (theme: Theme) => {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEMES[theme].browserChrome);
};

export function useTheme() {
  const [theme, setStoredTheme] = usePersistedState<Theme>('theme', DEFAULT_THEME, isTheme);
  const setTheme = (next: Theme) => {
    setStoredTheme(next);
    applyTheme(next);
  };
  return { theme, setTheme };
}
