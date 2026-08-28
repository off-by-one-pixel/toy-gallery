'use client';

import { useEffect } from 'react';
import { ExternalLink, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useMediaLightboxNav } from '@/features/sessions/media/useMediaLightboxNav';
import { usePrivacy } from '@/features/preferences/PrivacyProvider';
import { useSessionMedia } from '@/features/sessions/media/useSessionMedia';
import MediaLightbox from '@/features/sessions/media/MediaLightbox';
import SensitiveContent from '@/features/preferences/SensitiveContent';

type Props = Readonly<{ sessionId: number; expectedCount: number }>;

export default function SessionMediaStrip({ sessionId, expectedCount }: Props) {
  const t = useTranslations('session.media');
  const { hideSensitive } = usePrivacy();
  const { openIndex, open, close } = useMediaLightboxNav(sessionId);

  const { configured, media, isPending, isError } = useSessionMedia(sessionId);

  useEffect(() => {
    if (hideSensitive && openIndex !== null) close({ replace: true });
  }, [hideSensitive, openIndex, close]);

  if (!configured) return null;
  if (media && !media.configured) return null;

  const items = media?.items ?? [];
  const showSkeleton = isPending && expectedCount > 0;
  const showEmpty = isPending ? expectedCount === 0 : media != null && items.length === 0;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="text-caption font-medium uppercase tracking-wider text-text-tertiary">{t('heading')}</h3>
        {media?.shareUrl && (
          <a
            href={media.shareUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-caption font-medium text-muted transition-colors hover:text-foreground"
          >
            {t('openExternal')}
            <ExternalLink size={11} strokeWidth={2} />
          </a>
        )}
      </div>
      {showSkeleton && (
        <div className="flex gap-2">
          {Array.from({ length: expectedCount }, (_, i) => (
            <div key={i} className="h-16 w-16 animate-pulse rounded-lg bg-surface-secondary" />
          ))}
        </div>
      )}
      {isError && <p className="text-caption text-text-tertiary">{t('loadError')}</p>}
      {showEmpty && <p className="text-caption text-text-tertiary">{t('empty')}</p>}
      {media && items.length > 0 && (
        <SensitiveContent>
          <div className="flex flex-wrap gap-2">
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                aria-label={t('openLabel')}
                onClick={() => open(i)}
                className="relative h-16 w-16 overflow-hidden rounded-lg border border-border transition-transform hover:scale-105"
              >
                <img src={item.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                {item.kind === 'video' && (
                  <span className="absolute inset-0 grid place-items-center bg-black/25">
                    <Play size={18} className="fill-white text-white drop-shadow" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </SensitiveContent>
      )}
      {openIndex !== null && media && openIndex < items.length && (
        <MediaLightbox items={items} initialIndex={openIndex} onClose={() => close()} />
      )}
    </div>
  );
}
