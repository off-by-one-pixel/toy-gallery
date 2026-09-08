'use client';

import { ExternalLink, Heart, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';

import MediaLightbox from '@/features/sessions/media/MediaLightbox';
import SensitiveContent from '@/features/preferences/SensitiveContent';
import { useMediaStrip } from '@/features/sessions/media/useMediaStrip';

type Props = Readonly<{ sessionId: number; expectedCount: number }>;

export default function SessionMediaStrip({ sessionId, expectedCount }: Props) {
  const t = useTranslations('session.media');
  const state = useMediaStrip(sessionId, expectedCount);

  if (state.hidden) return null;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="text-caption font-medium uppercase tracking-wider text-text-tertiary">{t('heading')}</h3>
        {state.shareUrl && (
          <a
            href={state.shareUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-caption font-medium text-muted transition-colors hover:text-foreground"
          >
            {t('openExternal')}
            <ExternalLink size={11} strokeWidth={2} />
          </a>
        )}
      </div>
      {state.showSkeleton && (
        <div className="flex gap-2">
          {Array.from({ length: state.skeletonCount }, (_, i) => (
            <div key={i} className="h-16 w-16 animate-pulse rounded-lg bg-surface-secondary" />
          ))}
        </div>
      )}
      {state.showError && <p className="text-caption text-text-tertiary">{t('loadError')}</p>}
      {state.showEmpty && <p className="text-caption text-text-tertiary">{t('empty')}</p>}
      {state.items.length > 0 && (
        <SensitiveContent>
          <div className="flex flex-wrap gap-2">
            {state.items.map((item, i) => (
              <div key={item.id} className="relative">
                <button
                  type="button"
                  aria-label={t('openLabel')}
                  onClick={() => state.open(i)}
                  className="relative h-16 w-16 overflow-hidden rounded-lg border border-border transition-transform hover:scale-105"
                >
                  <img src={item.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                  {item.kind === 'video' && (
                    <span className="absolute inset-0 grid place-items-center bg-black/25">
                      <Play size={18} className="fill-white text-white drop-shadow" />
                    </span>
                  )}
                </button>
                {state.likesConfigured && (
                  <button
                    type="button"
                    aria-label={item.liked ? t('unlikeLabel') : t('likeLabel')}
                    aria-pressed={item.liked}
                    onClick={() => state.toggleLike(item)}
                    className="absolute right-0.5 top-0.5 z-10 grid h-6 w-6 place-items-center rounded-full bg-black/35 text-white transition-colors hover:bg-black/55"
                  >
                    <Heart size={13} strokeWidth={2.2} className={item.liked ? 'fill-rose-500 text-rose-500' : ''} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </SensitiveContent>
      )}
      {state.openIndex !== null && (
        <MediaLightbox items={state.items} initialIndex={state.openIndex} onClose={state.close} />
      )}
    </div>
  );
}
