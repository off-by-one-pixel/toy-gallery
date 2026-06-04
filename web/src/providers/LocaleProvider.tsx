'use client';

import { NextIntlClientProvider } from 'next-intl';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

import en from '../i18n/catalogs/en.json';
import { DEFAULT_LOCALE, isLocale, Locale } from '../i18n/routing';

const STORAGE_KEY = 'locale';

const MESSAGES: Record<Locale, typeof en> = {
  en,
};

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const stored = globalThis.window !== undefined ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored && isLocale(stored)) setLocaleState(stored);
  }, []);

  useEffect(() => {
    if (globalThis.window !== undefined) document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (globalThis.window !== undefined) localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return (
    <LocaleContext.Provider value={value}>
      <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}

export function useLocaleContext(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocaleContext must be used within LocaleProvider');
  return ctx;
}
