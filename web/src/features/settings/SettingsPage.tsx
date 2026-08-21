'use client';

import { useTranslations } from 'next-intl';

import TopBar from '@/components/TopBar';
import DataSection from '@/features/settings/DataSection';
import LanguageSection from '@/features/settings/LanguageSection';
import PasswordSection from '@/features/settings/PasswordSection';

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
