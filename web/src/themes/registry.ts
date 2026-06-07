export const THEMES = {
  light: {
    label: 'Light',
    browserChrome: '#f3f4f6',
    osPreference: 'light',
  },
  dark: {
    label: 'Dark',
    browserChrome: '#35353a',
    osPreference: 'dark',
  },
} as const;

export type Theme = keyof typeof THEMES;

export const DEFAULT_THEME: Theme = 'light';

export const isTheme = (value: string): value is Theme => Object.prototype.hasOwnProperty.call(THEMES, value);

export const OS_PREFERENCE_THEME_COLORS = Object.values(THEMES).map((def) => ({
  media: `(prefers-color-scheme: ${def.osPreference})`,
  color: def.browserChrome,
}));
