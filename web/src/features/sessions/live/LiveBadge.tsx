'use client';

import { useTranslations } from 'next-intl';

export default function LiveBadge() {
  const t = useTranslations('session.live');
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-live/15 px-2 py-0.5 text-xs font-semibold text-live-strong">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-live" />
      </span>
      {t('badge')}
    </span>
  );
}
