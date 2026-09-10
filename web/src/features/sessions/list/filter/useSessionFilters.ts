'use client';

import { useState } from 'react';

import type { Toy } from '@/api/types';
import { useToyUsage } from '@/features/sessions/list/useToyUsage';
import { filterToys } from '@/features/toys/search';
import {
  activeFilterCount,
  activeFlagKeys,
  type Period,
  NO_SESSION_FILTERS,
  SESSION_FLAG_FILTERS,
  SESSION_FLAG_KEYS,
  type SessionFilters,
  setTimeWindowFilter,
  type TimeWindow,
  toggleFlagFilter,
  toggleToyFilter,
  toyTooltip,
} from '@/features/sessions/session';

export const FULL_DAY: SliderValue = [0, 24];

const TOP_TOYS_LIMIT = 10;

export type SliderValue = readonly [number, number];

const sliderValueToWindow = ([from, to]: SliderValue): TimeWindow | null | undefined => {
  if (from === FULL_DAY[0] && to === FULL_DAY[1]) return null;
  return to > from ? { from, to } : undefined;
};

export type ToyOption = Readonly<{ toy: Toy; uses: number; toggle: () => void }>;

export type FlagOption = Readonly<{ key: string; labelKey: string; active: boolean; toggle: () => void }>;

export type TimeSliderState = Readonly<{
  value: SliderValue;
  onCommit: (value: SliderValue) => void;
}>;

export type FilterChip = Readonly<
  { key: string; remove: () => void } & (
    { kind: 'label'; label: string } | { kind: 'flag'; labelKey: string } | { kind: 'time'; from: number; to: number }
  )
>;

export type SessionFiltersState = Readonly<{
  count: number;
  query: string;
  setQuery: (query: string) => void;
  selectedToys: readonly ToyOption[];
  availableToys: readonly ToyOption[];
  hiddenToyCount: number;
  showAllToys: () => void;
  flags: readonly FlagOption[];
  slider: TimeSliderState;
  chips: readonly FilterChip[];
  clearAll: () => void;
}>;

export type SessionFiltersArgs = Readonly<{
  toys: readonly Toy[];
  toysById: ReadonlyMap<number, Toy>;
  period: Period;
  filters: SessionFilters;
  onChange: (next: SessionFilters) => void;
}>;

export function useSessionFilters({
  toys,
  toysById,
  period,
  filters,
  onChange,
}: SessionFiltersArgs): SessionFiltersState {
  const usageByToy = useToyUsage(period);
  const [query, setQuery] = useState('');
  const [toysExpanded, setToysExpanded] = useState(false);

  const byWindowUsage = (a: Toy, b: Toy) => (usageByToy.get(b.id) ?? 0) - (usageByToy.get(a.id) ?? 0);
  const toOption = (toy: Toy): ToyOption => ({
    toy,
    uses: usageByToy.get(toy.id) ?? 0,
    toggle: () => onChange(toggleToyFilter(filters, toy.id)),
  });

  const selectedToys = toys
    .filter((toy) => filters.toyIds.includes(toy.id))
    .sort(byWindowUsage)
    .map(toOption);
  const matchingToys = filterToys(
    toys.filter((toy) => !filters.toyIds.includes(toy.id) && usageByToy.has(toy.id)),
    query,
  )
    .slice()
    .sort(byWindowUsage)
    .map(toOption);
  const capped = !toysExpanded && query === '';
  const availableToys = capped ? matchingToys.slice(0, TOP_TOYS_LIMIT) : matchingToys;

  const flags = SESSION_FLAG_KEYS.map((key) => ({
    key,
    labelKey: SESSION_FLAG_FILTERS[key].labelKey,
    active: filters[key],
    toggle: () => onChange(toggleFlagFilter(filters, key)),
  }));

  const chips: FilterChip[] = [
    ...filters.toyIds.map((toyId): FilterChip => {
      const toy = toysById.get(toyId);
      return {
        kind: 'label',
        key: `toy-${toyId}`,
        label: toy ? toyTooltip(toy) : `#${toyId}`,
        remove: () => onChange(toggleToyFilter(filters, toyId)),
      };
    }),
    ...activeFlagKeys(filters).map((key): FilterChip => ({
      kind: 'flag',
      key,
      labelKey: SESSION_FLAG_FILTERS[key].labelKey,
      remove: () => onChange(toggleFlagFilter(filters, key)),
    })),
    ...(filters.timeWindow
      ? [
          {
            kind: 'time',
            key: 'time',
            from: filters.timeWindow.from,
            to: filters.timeWindow.to,
            remove: () => onChange(setTimeWindowFilter(filters, null)),
          } satisfies FilterChip,
        ]
      : []),
  ];

  const timeValue: SliderValue = filters.timeWindow ? [filters.timeWindow.from, filters.timeWindow.to] : FULL_DAY;

  return {
    count: activeFilterCount(filters),
    query,
    setQuery,
    selectedToys,
    availableToys,
    hiddenToyCount: matchingToys.length - availableToys.length,
    showAllToys: () => setToysExpanded(true),
    flags,
    chips,
    slider: {
      value: timeValue,
      onCommit: (next) => {
        const timeWindow = sliderValueToWindow(next);
        if (timeWindow !== undefined) onChange(setTimeWindowFilter(filters, timeWindow));
      },
    },
    clearAll: () => onChange(NO_SESSION_FILTERS),
  };
}
