export const LOCALES = {
  en: { label: 'English' },
} as const;

export type Locale = keyof typeof LOCALES;

export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_CODES = Object.keys(LOCALES) as readonly Locale[];

export const isLocale = (value: string): value is Locale => Object.prototype.hasOwnProperty.call(LOCALES, value);
