'use client';

import { useTranslations } from 'next-intl';

import { isLocale, LOCALES, type Locale } from '../../i18n/routing';
import { useLocaleContext } from '../../providers/LocaleProvider';
import LocaleSwitcher, { type LocaleOption } from '../LocaleSwitcher';

const OPTIONS: readonly LocaleOption[] = (Object.entries(LOCALES) as [Locale, { label: string }][]).map(
  ([code, { label }]) => ({ code, label }),
);

export default function LanguageSection() {
  const t = useTranslations('settings.language');
  const { locale, setLocale } = useLocaleContext();
  const handleChange = (code: string) => {
    if (isLocale(code)) setLocale(code);
  };
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <header className="mb-4">
        <h2 className="text-base font-semibold tracking-tight text-neutral-900">{t('heading')}</h2>
        <p className="mt-1 text-[13px] text-neutral-500">{t('description')}</p>
      </header>
      <LocaleSwitcher value={locale} options={OPTIONS} onChange={handleChange} />
    </section>
  );
}
