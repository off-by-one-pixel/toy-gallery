export const THEMES = {
  light: {
    label: 'Light',
    browserChrome: '#f3f4f6',
  },
  dark: {
    label: 'Dark',
    browserChrome: '#35353a',
  },
} as const;

export type Theme = keyof typeof THEMES;

export const DEFAULT_THEME: Theme = 'light';

export const THEME_NAMES = Object.keys(THEMES) as readonly Theme[];
