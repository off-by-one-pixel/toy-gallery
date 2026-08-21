'use client';

import { useTranslations } from 'next-intl';

import { isLocale, LOCALES, type Locale } from '@/i18n/routing';
import { useLocaleContext } from '@/features/preferences/LocaleProvider';
import LocaleSwitcher, { type LocaleOption } from '@/features/settings/LocaleSwitcher';
import SectionCard from '@/features/settings/SectionCard';
import SectionHeading from '@/components/SectionHeading';

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
    <SectionCard>
      <SectionHeading title={t('heading')} subtitle={t('description')} />
      <LocaleSwitcher value={locale} options={OPTIONS} onChange={handleChange} />
    </SectionCard>
  );
}
