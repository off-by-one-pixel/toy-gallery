'use client';

import { useEffect, useState } from 'react';
import { Button } from '@heroui/react';
import { useLocale, useTranslations } from 'next-intl';
import { useNavigation } from '@/hooks/useNavigation';
import { useNow } from '@/hooks/useNow';

import { useLiveSession } from '@/features/sessions/live/useLiveSession';
import { formatDuration, secondsBetween } from '@/lib/duration';
import { formatWhen } from '@/lib/dates';

const TICK_MS = 1000;

export default function LiveSessionBanner() {
  const { liveSession } = useLiveSession();
  const { navigate } = useNavigation();
  const t = useTranslations('session');
  const locale = useLocale();
  const now = useNow(TICK_MS, liveSession != null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!liveSession) return;
    const onScroll = () => setCollapsed(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [liveSession]);

  if (!liveSession) return null;

  const elapsed = secondsBetween(liveSession.startedAt, now.toISOString());
  const whenT = (key: 'today' | 'yesterday') => t(key);

  return (
    <div className="banner-in border-y border-live-strong/30 bg-live/10">
      <div
        className={`mx-auto flex max-w-300 items-center gap-3 px-4 transition-all sm:px-6 ${collapsed ? 'py-1' : 'py-2'}`}
      >
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-live" />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-foreground">
          <span className="font-semibold">{t('live.badge')}</span>
          <span className="text-muted">
            {' · '}
            {formatWhen(liveSession.startedAt, now, locale, whenT)}
            {' · '}
          </span>
          <span className="font-medium tabular-nums">{formatDuration(elapsed, locale, 'second')}</span>
        </span>
        {!collapsed && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 bg-surface"
            onPress={() => navigate(`/sessions/edit?id=${liveSession.id}`)}
          >
            {t('live.openButton')}
          </Button>
        )}
      </div>
    </div>
  );
}
