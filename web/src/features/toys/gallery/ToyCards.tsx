'use client';

import { useMemo } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { silhouetteHeight } from '@/features/toys/dimensions';
import { heightRatioFor, maxSilhouetteHeight } from '@/features/toys/scaling';
import { mergeGalleryItems, type GhostToy } from '@/features/toys/gallery/ghost/ghosts';
import { TOY_SORT } from '@/features/toys/toySort';
import { useSortOf } from '@/hooks/useSortOf';
import type { Toy } from '@/api/types';
import GhostToyCard from '@/features/toys/gallery/ghost/GhostToyCard';
import ToySortControl from '@/features/toys/gallery/ToySortControl';
import ToyCard from '@/features/toys/gallery/ToyCard';

type Props = Readonly<{
  toys: Toy[];
  ghosts: readonly GhostToy[];
  openToyId: number | null;
  onToggleOpen: (id: number) => void;
  onEdit: (toy: Toy) => void;
  onCopy: (toy: Toy) => void;
  onDelete: (toy: Toy) => void;
  onGhost?: (toy: Toy) => void;
  onEditGhost: (ghost: GhostToy) => void;
  onRemoveGhost: (id: number) => void;
  onClearGhosts: () => void;
  onNew: () => void;
}>;

export default function ToyCards({
  toys,
  ghosts,
  openToyId,
  onToggleOpen,
  onEdit,
  onCopy,
  onDelete,
  onGhost,
  onEditGhost,
  onRemoveGhost,
  onClearGhosts,
  onNew,
}: Props) {
  const t = useTranslations();
  const { sort } = useSortOf(TOY_SORT);
  const maxHeightMm = useMemo(() => maxSilhouetteHeight([...toys, ...ghosts]), [toys, ghosts]);
  const items = useMemo(() => mergeGalleryItems(toys, ghosts, sort), [toys, ghosts, sort]);

  return (
    <>
      <div className={`mb-3 items-center justify-end gap-2 ${ghosts.length > 0 ? 'flex' : 'hidden sm:flex'}`}>
        {ghosts.length > 0 && (
          <button
            type="button"
            onClick={onClearGhosts}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-amber-500 bg-amber-500/5 px-2.5 py-1.5 text-xs font-medium text-amber-600 transition-colors hover:bg-amber-500/15 dark:text-amber-400"
          >
            {t('toy.ghost.comparisons', { count: ghosts.length })}
            <span className="text-muted">{t('toy.ghost.clearAll')}</span>
            <X size={12} strokeWidth={2.2} />
          </button>
        )}
        <div className="hidden sm:block">
          <ToySortControl toys={toys} />
        </div>
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
        {items.map((item) =>
          item.kind === 'toy' ? (
            <ToyCard
              key={`toy-${item.toy.id}`}
              toy={item.toy}
              heightRatio={heightRatioFor(silhouetteHeight(item.toy), maxHeightMm)}
              detailsOpen={openToyId === item.toy.id}
              onToggleOpen={onToggleOpen}
              onEdit={onEdit}
              onCopy={onCopy}
              onDelete={onDelete}
              onGhost={onGhost}
              ghosts={ghosts}
              maxHeightMm={maxHeightMm}
            />
          ) : (
            <GhostToyCard
              key={`ghost-${item.ghost.id}`}
              ghost={item.ghost}
              heightRatio={heightRatioFor(silhouetteHeight(item.ghost), maxHeightMm)}
              onEdit={() => onEditGhost(item.ghost)}
              onRemove={() => onRemoveGhost(item.ghost.id)}
            />
          ),
        )}
        <button
          type="button"
          onClick={onNew}
          className="flex min-h-90 items-center justify-center rounded-2xl border-2 border-dashed border-border-secondary text-muted transition-colors hover:border-accent hover:bg-accent-soft/40 hover:text-accent-hover"
        >
          <span className="inline-flex items-center gap-2 font-medium">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground text-lg leading-none">
              +
            </span>
            <span>{t('toy.new')}</span>
          </span>
        </button>
      </div>
    </>
  );
}
