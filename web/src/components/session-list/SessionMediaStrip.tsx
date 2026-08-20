'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Play } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useMediaLightboxNav } from '../../hooks/nav/useMediaLightboxNav';
import { fetchSessionMedia } from '../../services/api';
import { usePrivacy } from '../../providers/PrivacyProvider';
import { queryKeys } from '../../services/queryKeys';
import MediaLightbox from '../MediaLightbox';
import SensitiveContent from '../SensitiveContent';

type Props = Readonly<{ sessionId: number; showHeading?: boolean }>;

export default function SessionMediaStrip({ sessionId, showHeading = true }: Props) {
  const t = useTranslations('session.media');
  const { hideSensitive } = usePrivacy();
  const { openIndex, open, close } = useMediaLightboxNav(sessionId);

  const {
    data: media,
    isPending,
    isError,
  } = useQuery({
    queryKey: queryKeys.sessionMedia(sessionId),
    queryFn: () => fetchSessionMedia(sessionId),
  });

  useEffect(() => {
    if (hideSensitive && openIndex !== null) close({ replace: true });
  }, [hideSensitive, openIndex, close]);

  if (media && !media.configured) return null;

  const items = media?.items ?? [];

  return (
    <div>
      {showHeading && (
        <h3 className="mb-2 text-caption font-medium uppercase tracking-wider text-text-tertiary">{t('heading')}</h3>
      )}
      {isPending && (
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 w-16 animate-pulse rounded-lg bg-surface-secondary" />
          ))}
        </div>
      )}
      {isError && <p className="text-caption text-text-tertiary">{t('loadError')}</p>}
      {media && items.length === 0 && <p className="text-caption text-text-tertiary">{t('empty')}</p>}
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
