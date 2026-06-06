'use client';

import { useTranslations } from 'next-intl';

import TopBar from '../TopBar';
import DataSection from './DataSection';
import LanguageSection from './LanguageSection';
import PasswordSection from './PasswordSection';

export default function SettingsPage() {
  const t = useTranslations('settings');
  return (
    <>
      <TopBar subtitle={t('pageTitle')} />
      <main className="mx-auto flex max-w-300 flex-col gap-6 px-6 py-6">
        <LanguageSection />
        <PasswordSection />
        <DataSection />
      </main>
    </>
  );
}
