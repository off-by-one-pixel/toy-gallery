'use client';

import { useContext, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@heroui/react';
import { Check, Funnel, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { fetchSessionStats } from '@/api';
import { BottomSheetContext } from '@/components/BottomSheet';
import ResponsiveOverlay from '@/components/ResponsiveOverlay';
import { queryKeys } from '@/api/queryKeys';
import type { Toy } from '@/api/types';
import { filterToys } from '@/features/toys/search';
import { toyTooltip } from '@/features/sessions/session';
import {
  activeFilterCount,
  type FilterKey,
  filterStartDate,
  SESSION_FLAG_FILTERS,
  SESSION_FLAG_KEYS,
  type SessionFilters,
  NO_SESSION_FILTERS,
  toggleFlagFilter,
  toggleToyFilter,
} from '@/features/sessions/session';

type Props = Readonly<{
  toys: readonly Toy[];
  filter: FilterKey;
  filters: SessionFilters;
  onChange: (next: SessionFilters) => void;
}>;

export default function SessionFilterControl({ toys, filter, filters, onChange }: Props) {
  const t = useTranslations('session.filters');
  const count = activeFilterCount(filters);

  const start = filterStartDate(filter);
  const { data: usageGroups } = useQuery({
    queryKey: queryKeys.sessions.stat('toy', ['count'], start, ''),
    queryFn: () => fetchSessionStats('toy', ['count'], { start }),
  });
  const usageByToy = useMemo(
    () => new Map((usageGroups ?? []).map((group) => [Number(group.key), group.values.count ?? 0])),
    [usageGroups],
  );

  const triggerClass = `inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors ${
    count > 0
      ? 'bg-accent-soft text-accent-soft-foreground hover:bg-accent-soft/80'
      : 'bg-surface-tertiary/70 text-muted hover:text-foreground'
  }`;

  return (
    <ResponsiveOverlay
      label={t('buttonLabel')}
      trigger={<TriggerContent label={t('buttonLabel')} count={count} />}
      triggerClassName={triggerClass}
      popoverClassName="flex flex-col overflow-hidden"
    >
      {({ close, mode }) => (
        <>
          <FilterPanel toys={toys} filters={filters} onChange={onChange} usageByToy={usageByToy} />
          {mode === 'sheet' && (
            <div className="shrink-0 px-2.5 pt-2">
              <Button variant="primary" size="sm" className="w-full" onPress={close}>
                {t('doneButton')}
              </Button>
            </div>
          )}
        </>
      )}
    </ResponsiveOverlay>
  );
}

function TriggerContent({ label, count }: Readonly<{ label: string; count: number }>) {
  return (
    <>
      <Funnel size={13} strokeWidth={2} />
      <span className="hidden sm:inline">{label}</span>
      {count > 0 && (
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
          {count}
        </span>
      )}
    </>
  );
}

function FilterPanel({
  toys,
  filters,
  onChange,
  usageByToy,
}: Readonly<{
  toys: readonly Toy[];
  filters: SessionFilters;
  onChange: (next: SessionFilters) => void;
  usageByToy: ReadonlyMap<number, number>;
}>) {
  const t = useTranslations('session.filters');
  const translate = t as unknown as (key: string) => string;
  const wide = useContext(BottomSheetContext);
  const [query, setQuery] = useState('');
  const count = activeFilterCount(filters);
  const byWindowUsage = (a: Toy, b: Toy) => (usageByToy.get(b.id) ?? 0) - (usageByToy.get(a.id) ?? 0);

  const selected = toys.filter((toy) => filters.toyIds.includes(toy.id)).sort(byWindowUsage);
  const unselected = filterToys(
    toys.filter((toy) => !filters.toyIds.includes(toy.id) && usageByToy.has(toy.id)),
    query,
  )
    .slice()
    .sort(byWindowUsage);

  return (
    <div className={`flex min-h-0 flex-col p-2.5 ${wide ? 'w-full' : 'w-66'}`}>
      <label className="mb-2 flex shrink-0 items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5">
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
          <div className="flex max-h-40 shrink-0 flex-col gap-px overflow-y-auto pr-1.5">
            {selected.map((toy) => (
              <ToyRow
                key={toy.id}
                toy={toy}
                uses={usageByToy.get(toy.id) ?? 0}
                checked
                onToggle={() => onChange(toggleToyFilter(filters, toy.id))}
              />
            ))}
          </div>
          <div className="my-1.5 h-px shrink-0 bg-border" />
        </>
      )}
      <SectionLabel text={t('toysHeading')} />
      <div className="min-h-0 flex-1 overflow-y-auto pr-1.5">
        {unselected.map((toy) => (
          <ToyRow
            key={toy.id}
            toy={toy}
            uses={usageByToy.get(toy.id) ?? 0}
            checked={false}
            onToggle={() => onChange(toggleToyFilter(filters, toy.id))}
          />
        ))}
        {unselected.length === 0 && <p className="px-2.5 py-1.5 text-xs text-text-tertiary">{t('noToys')}</p>}
      </div>
      <div className="my-1.5 h-px shrink-0 bg-border" />
      <SectionLabel text={t('moreHeading')} />
      <div className="shrink-0">
        {SESSION_FLAG_KEYS.map((key) => (
          <CheckRow
            key={key}
            label={translate(SESSION_FLAG_FILTERS[key].labelKey)}
            checked={filters[key]}
            onToggle={() => onChange(toggleFlagFilter(filters, key))}
          />
        ))}
      </div>
      {count > 0 && (
        <button
          type="button"
          onClick={() => onChange(NO_SESSION_FILTERS)}
          className="mt-2 shrink-0 self-start px-2.5 text-xs font-medium text-muted transition-colors hover:text-foreground"
        >
          {t('clearAll')}
        </button>
      )}
    </div>
  );
}

function SectionLabel({ text }: Readonly<{ text: string }>) {
  return <div className="shrink-0 px-2.5 pb-1 text-caption uppercase tracking-wider text-text-tertiary">{text}</div>;
}

function ToyRow({
  toy,
  uses,
  checked,
  onToggle,
}: Readonly<{ toy: Toy; uses: number; checked: boolean; onToggle: () => void }>) {
  return <CheckRow label={toyTooltip(toy)} meta={`${uses}`} checked={checked} onToggle={onToggle} />;
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
      <span className="min-w-0 flex-1">{label}</span>
      {meta !== undefined && <span className="text-caption text-text-tertiary">{meta}</span>}
    </label>
  );
}
