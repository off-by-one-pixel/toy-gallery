'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Toy } from '@/api/types';
import {
  activeFilterCount,
  type SessionFilters,
  NO_SESSION_FILTERS,
  toggleToyFilter,
} from '@/features/sessions/session';

type Props = Readonly<{
  toysById: ReadonlyMap<number, Toy>;
  filters: SessionFilters;
  onChange: (next: SessionFilters) => void;
}>;

export default function SessionFilterChips({ toysById, filters, onChange }: Props) {
  const t = useTranslations('session.filters');
  if (activeFilterCount(filters) === 0) return null;
  return (
    <div className="mx-auto flex max-w-300 flex-wrap items-center gap-2 px-4 pt-1 pb-3 sm:px-6">
      {filters.toyIds.map((toyId) => {
        const toy = toysById.get(toyId);
        const label = toy ? `${toy.brand} ${toy.name}`.trim() : `#${toyId}`;
        return <Chip key={toyId} label={label} onRemove={() => onChange(toggleToyFilter(filters, toyId))} />;
      })}
      {filters.hasMedia && <Chip label={t('hasMedia')} onRemove={() => onChange({ ...filters, hasMedia: false })} />}
      <button
        type="button"
        onClick={() => onChange(NO_SESSION_FILTERS)}
        className="text-xs font-medium text-muted transition-colors hover:text-foreground"
      >
        {t('clearAll')}
      </button>
    </div>
  );
}

function Chip({ label, onRemove }: Readonly<{ label: string; onRemove: () => void }>) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-soft bg-accent-soft/60 py-1 pr-1.5 pl-2.5 text-xs font-medium text-accent-soft-foreground">
      {label}
      <button
        type="button"
        aria-label={`${label} ×`}
        onClick={onRemove}
        className="grid h-4 w-4 place-items-center rounded-full transition-colors hover:bg-accent-soft"
      >
        <X size={11} strokeWidth={2.4} />
      </button>
    </span>
  );
}
