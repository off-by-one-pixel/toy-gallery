'use client';

import { useTranslations } from 'next-intl';

import LocaleSwitcher from '../LocaleSwitcher';

export default function LanguageSection() {
  const t = useTranslations('settings.language');
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <header className="mb-4">
        <h2 className="text-base font-semibold tracking-tight text-neutral-900">{t('heading')}</h2>
        <p className="mt-1 text-[13px] text-neutral-500">{t('description')}</p>
      </header>
      <LocaleSwitcher />
    </section>
  );
}
