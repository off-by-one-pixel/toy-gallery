'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { usePrivacy } from '@/providers/PrivacyProvider';

export default function PrivacyToggle() {
  const { hideSensitive, toggleHideSensitive } = usePrivacy();
  const t = useTranslations('privacy');
  return (
    <button
      type="button"
      role="switch"
      aria-checked={hideSensitive}
      aria-label={hideSensitive ? t('show') : t('hide')}
      onClick={toggleHideSensitive}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
        hideSensitive
          ? 'bg-accent-soft text-accent-soft-foreground hover:bg-accent-soft/80'
          : 'text-muted hover:bg-surface-tertiary/60 hover:text-foreground'
      }`}
    >
      {hideSensitive ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
    </button>
  );
}
