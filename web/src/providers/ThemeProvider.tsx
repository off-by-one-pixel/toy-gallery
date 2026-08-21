'use client';

import { ReactNode, useEffect, useMemo } from 'react';

import { DEFAULT_THEME, isTheme, type Theme, THEMES } from '@/themes/registry';
import { createPersistedProvider } from '@/providers/createPersistedProvider';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const { Provider, useValue } = createPersistedProvider<Theme>({
  storageKey: 'theme',
  defaultValue: DEFAULT_THEME,
  decode: (stored) => (isTheme(stored) ? stored : undefined),
  encode: (theme) => theme,
  errorMessage: 'useThemeContext must be used within ThemeProvider',
});

export function useThemeContext(): ThemeContextValue {
  const { value, setValue } = useValue();
  return useMemo(() => ({ theme: value, setTheme: setValue }), [value, setValue]);
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

function ThemeDomBridge({ children }: Readonly<{ children: ReactNode }>) {
  const { theme } = useThemeContext();
  useEffect(() => applyTheme(theme), [theme]);
  return <>{children}</>;
}

export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Provider>
      <ThemeDomBridge>{children}</ThemeDomBridge>
    </Provider>
  );
}
