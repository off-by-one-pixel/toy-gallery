'use client';

import { useEffect, useState } from 'react';
import { Modal, useOverlayState } from '@heroui/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { SessionMediaItem } from '../services/types';

type Props = Readonly<{
  items: readonly SessionMediaItem[];
  initialIndex: number;
  onClose: () => void;
}>;

export default function MediaLightbox({ items, initialIndex, onClose }: Props) {
  const t = useTranslations('session.media');
  const [index, setIndex] = useState(initialIndex);

  const overlayState = useOverlayState({
    defaultOpen: true,
    onOpenChange: (isOpen) => {
      if (!isOpen) onClose();
    },
  });

  const prev = () => setIndex((i) => (i - 1 + items.length) % items.length);
  const next = () => setIndex((i) => (i + 1) % items.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const item = items[index];
  if (!item) return null;

  return (
    <Modal.Root state={overlayState}>
      <Modal.Backdrop className="bg-black/80">
        <Modal.Container size="full" placement="center">
          <Modal.Dialog className="flex h-full flex-col bg-black">
            <div className="flex items-center justify-end gap-2 p-3">
              <span className="mr-auto text-caption tabular-nums text-white/60">
                {index + 1} / {items.length}
              </span>
              <button
                type="button"
                aria-label={t('closeLabel')}
                onClick={() => overlayState.close()}
                className="rounded-md p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center px-14 pb-6">
              {item.kind === 'video' ? (
                <video key={item.id} src={item.fullUrl} controls autoPlay className="max-h-full max-w-full" />
              ) : (
                <img key={item.id} src={item.fullUrl} alt="" className="max-h-full max-w-full object-contain" />
              )}
              {items.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label={t('prevLabel')}
                    onClick={prev}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <button
                    type="button"
                    aria-label={t('nextLabel')}
                    onClick={next}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                  >
                    <ChevronRight size={22} />
                  </button>
                </>
              )}
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
