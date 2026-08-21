'use client';

import { NextIntlClientProvider } from 'next-intl';
import { ReactNode, useEffect, useMemo } from 'react';

import en from '@/i18n/catalogs/en.json';
import { DEFAULT_LOCALE, isLocale, Locale } from '@/i18n/routing';
import { createPersistedProvider } from './createPersistedProvider';

const MESSAGES: Record<Locale, typeof en> = {
  en,
};

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const { Provider, useValue } = createPersistedProvider<Locale>({
  storageKey: 'locale',
  defaultValue: DEFAULT_LOCALE,
  decode: (stored) => (isLocale(stored) ? stored : undefined),
  encode: (locale) => locale,
  errorMessage: 'useLocaleContext must be used within LocaleProvider',
});

export function useLocaleContext(): LocaleContextValue {
  const { value, setValue } = useValue();
  return useMemo(() => ({ locale: value, setLocale: setValue }), [value, setValue]);
}

function LocaleBridge({ children }: Readonly<{ children: ReactNode }>) {
  const { locale } = useLocaleContext();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
      {children}
    </NextIntlClientProvider>
  );
}

export function LocaleProvider({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Provider>
      <LocaleBridge>{children}</LocaleBridge>
    </Provider>
  );
}
