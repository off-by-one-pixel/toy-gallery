'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { heightScale } from '@/services/scaling';
import type { Toy } from '@/services/types';
import ToySortControl from './ToySortControl';
import ToyCard from './ToyCard';

type Props = Readonly<{
  toys: Toy[];
  openToyId: number | null;
  onToggleOpen: (id: number) => void;
  onEdit: (toy: Toy) => void;
  onCopy: (toy: Toy) => void;
  onDelete: (toy: Toy) => void;
  onNew: () => void;
}>;

export default function ToyCards({ toys, openToyId, onToggleOpen, onEdit, onCopy, onDelete, onNew }: Props) {
  const t = useTranslations();
  const scale = useMemo(() => heightScale(toys), [toys]);

  return (
    <>
      <div className="mb-3 hidden justify-end sm:flex">
        <ToySortControl />
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
        {toys.map((toy) => (
          <ToyCard
            key={toy.id}
            toy={toy}
            heightRatio={scale(toy)}
            detailsOpen={openToyId === toy.id}
            onToggleDetails={() => onToggleOpen(toy.id)}
            onEdit={onEdit}
            onCopy={onCopy}
            onDelete={onDelete}
          />
        ))}
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
