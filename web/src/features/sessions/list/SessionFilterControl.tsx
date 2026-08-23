'use client';

import { useState } from 'react';
import { Dropdown } from '@heroui/react';
import { Check, Funnel, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Toy } from '@/api/types';
import { filterToys } from '@/features/toys/search';
import {
  activeFilterCount,
  type SessionFilters,
  NO_SESSION_FILTERS,
  toggleToyFilter,
} from '@/features/sessions/session';

type Props = Readonly<{
  toys: readonly Toy[];
  filters: SessionFilters;
  onChange: (next: SessionFilters) => void;
}>;

const byUsage = (a: Toy, b: Toy) => (b.usageCount ?? 0) - (a.usageCount ?? 0);

export default function SessionFilterControl({ toys, filters, onChange }: Props) {
  const t = useTranslations('session.filters');
  const [query, setQuery] = useState('');
  const count = activeFilterCount(filters);

  const selected = toys.filter((toy) => filters.toyIds.includes(toy.id)).sort(byUsage);
  const unselected = filterToys(
    toys.filter((toy) => !filters.toyIds.includes(toy.id)),
    query,
  )
    .slice()
    .sort(byUsage);

  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label={t('buttonLabel')}
        className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors ${
          count > 0
            ? 'bg-accent-soft text-accent-soft-foreground hover:bg-accent-soft/80'
            : 'bg-surface-tertiary/70 text-muted hover:text-foreground'
        }`}
      >
        <Funnel size={13} strokeWidth={2} />
        <span className="hidden sm:inline">{t('buttonLabel')}</span>
        {count > 0 && (
          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
            {count}
          </span>
        )}
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom start">
        <div className="flex w-66 flex-col p-2.5">
          <label className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5">
            <Search size={13} strokeWidth={2} className="shrink-0 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="min-w-0 flex-1 border-0 bg-transparent text-xs text-foreground outline-none placeholder:text-text-tertiary"
            />
          </label>
          {selected.length > 0 && (
            <>
              <SectionLabel text={t('selectedHeading', { count: selected.length })} />
              {selected.map((toy) => (
                <ToyRow key={toy.id} toy={toy} checked onToggle={() => onChange(toggleToyFilter(filters, toy.id))} />
              ))}
              <div className="my-1.5 h-px bg-border" />
            </>
          )}
          <SectionLabel text={t('toysHeading')} />
          <div className="max-h-60 overflow-y-auto">
            {unselected.map((toy) => (
              <ToyRow
                key={toy.id}
                toy={toy}
                checked={false}
                onToggle={() => onChange(toggleToyFilter(filters, toy.id))}
              />
            ))}
            {unselected.length === 0 && <p className="px-2.5 py-1.5 text-xs text-text-tertiary">{t('noToys')}</p>}
          </div>
          <div className="my-1.5 h-px bg-border" />
          <SectionLabel text={t('mediaHeading')} />
          <CheckRow
            label={t('hasPhotos')}
            checked={filters.hasPhotos}
            onToggle={() => onChange({ ...filters, hasPhotos: !filters.hasPhotos })}
          />
          <CheckRow
            label={t('hasVideos')}
            checked={filters.hasVideos}
            onToggle={() => onChange({ ...filters, hasVideos: !filters.hasVideos })}
          />
          {count > 0 && (
            <button
              type="button"
              onClick={() => onChange(NO_SESSION_FILTERS)}
              className="mt-2 self-start px-2.5 text-xs font-medium text-muted transition-colors hover:text-foreground"
            >
              {t('clearAll')}
            </button>
          )}
        </div>
      </Dropdown.Popover>
    </Dropdown>
  );
}

function SectionLabel({ text }: Readonly<{ text: string }>) {
  return <div className="px-2.5 pb-1 text-caption uppercase tracking-wider text-text-tertiary">{text}</div>;
}

function ToyRow({ toy, checked, onToggle }: Readonly<{ toy: Toy; checked: boolean; onToggle: () => void }>) {
  return (
    <CheckRow
      label={`${toy.brand} ${toy.name}`.trim()}
      meta={`${toy.usageCount ?? 0}`}
      checked={checked}
      onToggle={onToggle}
    />
  );
}

function CheckRow({
  label,
  meta,
  checked,
  onToggle,
}: Readonly<{ label: string; meta?: string; checked: boolean; onToggle: () => void }>) {
  return (
    <label
      className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
        checked ? 'bg-accent-soft text-accent-soft-foreground' : 'text-foreground hover:bg-surface-tertiary/60'
      }`}
    >
      <input type="checkbox" checked={checked} onChange={onToggle} className="sr-only" />
      <span
        className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${
          checked ? 'border-accent bg-accent text-accent-foreground' : 'border-border-secondary bg-surface'
        }`}
      >
        {checked && <Check size={11} strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {meta !== undefined && <span className="text-caption text-text-tertiary">{meta}</span>}
    </label>
  );
}
