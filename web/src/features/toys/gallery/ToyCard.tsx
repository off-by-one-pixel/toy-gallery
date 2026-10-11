'use client';

import { memo } from 'react';
import { Chip } from '@heroui/react';
import { useTranslations } from 'next-intl';
import { displayGirth } from '@/features/preferences/girth';
import { formatValue, type Unit } from '@/features/preferences/units';
import { type Toy } from '@/api/types';
import { useSortOf } from '@/hooks/useSortOf';
import { TOY_SORT } from '@/features/toys/toySort';
import ToyDetails from '@/features/toys/gallery/ToyDetails';
import { sortColumnDisplay } from '@/features/toys/gallery/sortColumnDisplay';
import { useToyPropertyContext } from '@/features/toys/useToyPropertyContext';
import ToyActionButtons, { type ToyActions } from '@/features/toys/gallery/ToyActionButtons';
import GhostCompareOverlay from '@/features/toys/gallery/ghost/GhostCompareOverlay';
import {
  formatSignedMm,
  ghostColor,
  ghostDelta,
  isDangerousGirthDelta,
  type GhostToy,
} from '@/features/toys/gallery/ghost/ghosts';
import ToyThumbnail from '@/features/toys/ToyThumbnail';
import { pressable } from '@/lib/pressable';

type Props = Readonly<{
  toy: Toy;
  heightRatio: number;
  detailsOpen: boolean;
  onToggleOpen: (id: number) => void;
  actions: ToyActions;
  ghosts: readonly GhostToy[];
  maxHeightMm: number;
}>;

function ToyCard({ toy, heightRatio, detailsOpen, onToggleOpen, actions, ghosts, maxHeightMm }: Props) {
  const propertyCtx = useToyPropertyContext();
  const { unit, girth } = propertyCtx;
  const common = useTranslations('common');
  const { sort } = useSortOf(TOY_SORT);
  const sortDisplay = sortColumnDisplay(sort.column, propertyCtx);
  const sortValue = sortDisplay?.valueFor(toy);

  return (
    <div
      className={
        'group relative bg-surface shadow-sm transition-[transform,box-shadow] duration-200 ' +
        (detailsOpen
          ? 'z-10 rounded-t-2xl rounded-b-none'
          : 'z-0 rounded-2xl hover:shadow-lg motion-safe:hover:-translate-y-1')
      }
    >
      <div
        className="cursor-pointer rounded-[inherit]"
        {...pressable(() => onToggleOpen(toy.id))}
        aria-expanded={detailsOpen}
      >
        <ToyThumbnail
          shape={toy.shape}
          fillColor={toy.color}
          heightRatio={heightRatio}
          className="h-60 overflow-hidden rounded-t-2xl border-b border-border"
        >
          {sortDisplay && sortValue != null && (
            <div className="absolute top-2.5 right-2.5 z-10 transition-opacity group-hover:opacity-0">
              <Chip size="sm" className="bg-surface shadow-sm">
                <Chip.Label>
                  <span className="inline-flex items-baseline gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-muted">{sortDisplay.label}</span>
                    <span className="font-semibold tabular-nums">{sortValue}</span>
                  </span>
                </Chip.Label>
              </Chip>
            </div>
          )}
          <div className="absolute top-2.5 right-2.5 z-10 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
            <ToyActionButtons toy={toy} actions={actions} stopPropagation />
          </div>
          {ghosts.length > 0 && <GhostCompareOverlay ghosts={ghosts} maxHeightMm={maxHeightMm} visible={detailsOpen} />}
        </ToyThumbnail>
        <div className="px-3.5 py-3">
          <div className="mb-2 flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-caption font-medium uppercase tracking-wider text-muted truncate">{toy.brand}</div>
              <div className="truncate text-sm font-semibold text-foreground">{toy.name}</div>
            </div>
            {toy.size && (
              <Chip size="sm" color="accent" className="shrink-0">
                <Chip.Label>{toy.size}</Chip.Label>
              </Chip>
            )}
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-border pt-2.5">
            <Metric
              label={common('insertable')}
              value={toy.insertableLength}
              unit={unit}
              deltas={ghosts.map((ghost) => ({
                id: ghost.id,
                color: ghostColor(ghost),
                value: ghostDelta(toy.insertableLength, ghost.insertableLength),
              }))}
            />
            <Metric
              label={common(girth)}
              value={displayGirth(toy.circumference, girth)}
              unit={unit}
              deltas={ghosts.map((ghost) => ({
                id: ghost.id,
                color: ghostColor(ghost),
                value: ghostDelta(
                  displayGirth(toy.circumference, girth),
                  displayGirth(ghost.circumference, girth) ?? 0,
                ),
                dangerous: isDangerousGirthDelta(ghostDelta(toy.circumference, ghost.circumference)),
              }))}
              bordered
            />
          </div>
        </div>
      </div>

      <div
        className={
          'absolute left-0 right-0 top-[calc(100%-14px)] z-20 flex flex-col gap-1 overflow-hidden rounded-b-2xl border-2 border-t-0 bg-surface px-4 pb-3.5 pt-4 shadow-md transition-[visibility,opacity,transform,border-color] duration-200 ' +
          (detailsOpen
            ? 'visible translate-y-0 border-accent opacity-100'
            : 'invisible -translate-y-2 border-transparent opacity-0 pointer-events-none')
        }
      >
        <ToyDetails toy={toy} active={detailsOpen} />
      </div>

      <div
        aria-hidden
        className={
          'pointer-events-none absolute inset-0 z-30 rounded-t-2xl border-2 border-b-0 border-accent transition-opacity duration-200 ' +
          (detailsOpen ? 'opacity-100' : 'opacity-0')
        }
      />
    </div>
  );
}

export default memo(ToyCard);

const DELTA_TEXT_SIZES = ['text-xs', 'text-xs', 'text-[10px]', 'text-[9px]'] as const;

function Metric({
  label,
  value,
  unit,
  deltas = [],
  bordered,
}: Readonly<{
  label: string;
  value: number | null | undefined;
  unit: Unit;
  deltas?: readonly { id: number; color: string; value: number | null; dangerous?: boolean }[];
  bordered?: boolean;
}>) {
  const deltaSize = DELTA_TEXT_SIZES[Math.min(deltas.length, DELTA_TEXT_SIZES.length - 1)];
  return (
    <div className={bordered ? 'pl-3 border-l border-border' : ''}>
      <div className="flex items-baseline gap-1 text-[22px] font-semibold leading-none tracking-tight text-foreground tabular-nums">
        {formatValue(value, unit)}
        {value != null && <span className="text-xs font-medium text-muted">{unit.id}</span>}
      </div>
      {deltas.length > 0 && (
        <div className={`mt-1 flex gap-1 font-semibold tabular-nums ${deltaSize}`}>
          {deltas.map((delta) => (
            <span
              key={delta.id}
              style={{ color: delta.color }}
              className={delta.dangerous ? 'whitespace-nowrap rounded bg-danger/15 px-1' : 'whitespace-nowrap'}
            >
              {formatSignedMm(delta.value, unit)}
            </span>
          ))}
        </div>
      )}
      <div className="mt-0.5 text-caption uppercase tracking-wider text-text-tertiary">{label}</div>
    </div>
  );
}
