'use client';

import { ghostColor, ghostEditorToy, ghostSilhouetteHeight, type GhostToy } from '@/features/toys/gallery/ghosts';
import { heightRatioFor } from '@/features/toys/scaling';
import ToyThumbnail from '@/features/toys/ToyThumbnail';

type Props = Readonly<{
  ghosts: readonly GhostToy[];
  maxHeightMm: number;
  visible?: boolean;
}>;

export default function GhostCompareOverlay({ ghosts, maxHeightMm, visible }: Props) {
  return (
    <>
      {ghosts.map((ghost) => (
        <div
          key={ghost.id}
          className={`pointer-events-none absolute inset-0 z-10 transition-opacity ${visible ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        >
          <ToyThumbnail
            toy={ghostEditorToy(ghost)}
            fillColor="transparent"
            strokeColor={ghostColor(ghost)}
            borderWidth={2}
            heightRatio={heightRatioFor(ghostSilhouetteHeight(ghost), maxHeightMm)}
            background="none"
            className="h-full"
          />
        </div>
      ))}
    </>
  );
}
