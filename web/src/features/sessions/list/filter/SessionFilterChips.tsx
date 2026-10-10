'use client';

import { X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { localizedHourLabel } from '@/lib/dates';
import {
  type FilterChip,
  type SessionFiltersArgs,
  useSessionFilters,
} from '@/features/sessions/list/filter/useSessionFilters';

export default function SessionFilterChips(props: SessionFiltersArgs) {
  const t = useTranslations('session.filters');
  const locale = useLocale();
  const state = useSessionFilters(props);
  if (state.count === 0) return null;

  const chipLabel = (chip: FilterChip): string => {
    if (chip.kind === 'label') return chip.label;
    if (chip.kind === 'flag') return t(chip.labelKey);
    return `${localizedHourLabel(chip.from, locale)} – ${localizedHourLabel(chip.to % 24, locale)}`;
  };

  return (
    <div className="mx-auto flex max-w-300 flex-wrap items-center gap-2 px-4 pt-1 pb-3 sm:px-6">
      {state.chips.map((chip) => (
        <Chip key={chip.key} label={chipLabel(chip)} onRemove={chip.remove} />
      ))}
      <button
        type="button"
        onClick={state.clearAll}
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
