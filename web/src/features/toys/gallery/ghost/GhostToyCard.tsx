'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useGirth } from '@/features/preferences/GirthProvider';
import { displayGirth } from '@/features/preferences/girth';
import { useUnit } from '@/features/preferences/UnitProvider';
import { formatValue } from '@/features/preferences/units';
import { ghostColor, ghostEditorToy, type GhostToy } from '@/features/toys/gallery/ghost/ghosts';
import ToyThumbnail from '@/features/toys/ToyThumbnail';

type Props = Readonly<{
  ghost: GhostToy;
  heightRatio: number;
  onEdit: () => void;
  onRemove: () => void;
}>;

export default function GhostToyCard({ ghost, heightRatio, onEdit, onRemove }: Props) {
  const t = useTranslations('toy.ghost');
  const { unit } = useUnit();
  const { girth } = useGirth();
  const color = ghostColor(ghost);

  return (
    <div
      className="group relative z-0 rounded-2xl border-2 border-dashed transition-shadow hover:shadow-lg"
      style={{ borderColor: color, backgroundColor: `${color}0d` }}
    >
      <button
        type="button"
        aria-label={t('editHint')}
        onClick={onEdit}
        className="absolute inset-0 z-0 h-full w-full cursor-pointer rounded-2xl"
      />
      <span
        className="pointer-events-none absolute top-2.5 left-2.5 z-10 rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-white tabular-nums"
        style={{ backgroundColor: color }}
      >
        {t('badge')} · {formatValue(displayGirth(ghost.circumference, girth), unit)} ×{' '}
        {formatValue(ghost.insertableLength, unit)} {unit.id}
      </span>
      <button
        type="button"
        aria-label={t('remove')}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-2.5 right-2.5 z-10 grid h-6 w-6 place-items-center rounded-full bg-surface text-muted shadow-sm transition-colors hover:text-foreground"
      >
        <X size={13} strokeWidth={2.2} />
      </button>
      <div className="pointer-events-none border-b border-dashed" style={{ borderColor: `${color}66` }}>
        <ToyThumbnail
          toy={ghostEditorToy(ghost)}
          fillColor={`${color}2e`}
          strokeColor={color}
          borderWidth={2}
          heightRatio={heightRatio}
          background="none"
          className="h-60 overflow-hidden rounded-t-2xl"
        />
      </div>
      <div className="pointer-events-none px-3.5 py-3">
        <div className="text-sm font-semibold" style={{ color }}>
          {t('badge')}{' '}
          <span className="text-caption font-normal text-muted">{t('from', { name: ghost.sourceName })}</span>
        </div>
        <div className="mt-1 text-meta tabular-nums" style={{ color }}>
          {formatValue(displayGirth(ghost.circumference, girth), unit)} × {formatValue(ghost.insertableLength, unit)}{' '}
          {unit.id}
          <span className="ml-1.5 text-caption text-text-tertiary">· {t('editHint')}</span>
        </div>
      </div>
    </div>
  );
}
