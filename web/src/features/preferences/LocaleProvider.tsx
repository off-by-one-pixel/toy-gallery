'use client';

import { NextIntlClientProvider } from 'next-intl';
import { ReactNode, useEffect } from 'react';

import en from '@/i18n/catalogs/en.json';
import { oneOf, usePersistedState } from '@/hooks/usePersistedState';
import { DEFAULT_LOCALE, Locale, LOCALE_CODES } from '@/i18n/routing';

const MESSAGES: Record<Locale, typeof en> = {
  en,
};

const isLocale = oneOf(LOCALE_CODES);

export function useLocalePreference() {
  const [locale, setLocale] = usePersistedState<Locale>('locale', DEFAULT_LOCALE, isLocale);
  return { locale, setLocale };
}

export function LocaleProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { locale } = useLocalePreference();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
      {children}
    </NextIntlClientProvider>
  );
}
