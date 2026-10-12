'use client';

import { useTranslations } from 'next-intl';

import LiveDot from '@/features/sessions/live/LiveDot';

export default function LiveBadge() {
  const t = useTranslations('session.live');
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-live/15 px-2 py-0.5 text-xs font-semibold text-live-strong">
      <LiveDot />
      {t('badge')}
    </span>
  );
}
