'use client';

import Lightbox, { type Slide } from 'yet-another-react-lightbox';
import Counter from 'yet-another-react-lightbox/plugins/counter';
import Video from 'yet-another-react-lightbox/plugins/video';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import { useTranslations } from 'next-intl';

import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/counter.css';

import type { SessionMediaItem } from '@/api/types';

type Props = Readonly<{
  items: readonly SessionMediaItem[];
  initialIndex: number;
  onClose: () => void;
}>;

const toSlide = (item: SessionMediaItem): Slide =>
  item.kind === 'video'
    ? {
        type: 'video',
        poster: item.thumbnailUrl,
        controls: true,
        autoPlay: true,
        playsInline: true,
        sources: [{ src: item.fullUrl, type: 'video/mp4' }],
      }
    : { src: item.fullUrl };

export default function MediaLightbox({ items, initialIndex, onClose }: Props) {
  const t = useTranslations('session.media');

  return (
    <Lightbox
      open
      close={onClose}
      index={initialIndex}
      slides={items.map(toSlide)}
      plugins={[Counter, Video, Zoom]}
      carousel={{ finite: items.length <= 1 }}
      controller={{ closeOnBackdropClick: true }}
      labels={{
        Previous: t('prevLabel'),
        Next: t('nextLabel'),
        Close: t('closeLabel'),
      }}
      counter={{ container: { style: { top: 0, left: 0 } } }}
    />
  );
}
