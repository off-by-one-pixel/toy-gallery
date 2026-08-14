'use client';

import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { fetchSessionMedia } from '../../services/api';
import { usePrivacy } from '../../providers/PrivacyProvider';
import type { SessionMediaItem } from '../../services/types';
import MediaLightbox from '../MediaLightbox';
import SensitiveContent from '../SensitiveContent';

type Props = Readonly<{ sessionId: number; showHeading?: boolean }>;

type LoadState =
  | { kind: 'loading' }
  | { kind: 'hidden' }
  | { kind: 'error' }
  | { kind: 'ready'; items: SessionMediaItem[] };

export default function SessionMediaStrip({ sessionId, showHeading = true }: Props) {
  const t = useTranslations('session.media');
  const { hideSensitive } = usePrivacy();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (hideSensitive) setOpenIndex(null);
  }, [hideSensitive]);

  useEffect(() => {
    let cancelled = false;
    fetchSessionMedia(sessionId)
      .then((media) => {
        if (cancelled) return;
        if (!media.configured) setState({ kind: 'hidden' });
        else setState({ kind: 'ready', items: media.items });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (state.kind === 'hidden') return null;

  return (
    <div onClick={(e) => e.stopPropagation()}>
      {showHeading && (
        <h3 className="mb-2 text-caption font-medium uppercase tracking-wider text-text-tertiary">{t('heading')}</h3>
      )}
      {state.kind === 'loading' && (
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 w-16 animate-pulse rounded-lg bg-surface-secondary" />
          ))}
        </div>
      )}
      {state.kind === 'error' && <p className="text-caption text-text-tertiary">{t('loadError')}</p>}
      {state.kind === 'ready' && state.items.length === 0 && (
        <p className="text-caption text-text-tertiary">{t('empty')}</p>
      )}
      {state.kind === 'ready' && state.items.length > 0 && (
        <SensitiveContent>
          <div className="flex flex-wrap gap-2">
            {state.items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                aria-label={t('openLabel')}
                onClick={() => setOpenIndex(i)}
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
      {openIndex !== null && state.kind === 'ready' && (
        <MediaLightbox items={state.items} initialIndex={openIndex} onClose={() => setOpenIndex(null)} />
      )}
    </div>
  );
}
