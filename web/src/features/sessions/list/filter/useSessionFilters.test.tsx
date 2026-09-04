// @vitest-environment happy-dom

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const usageState = vi.hoisted(() => ({ current: new Map<number, number>() }));

vi.mock('@/features/sessions/list/useToyUsage', () => ({
  useToyUsage: () => usageState.current,
}));

import type { SessionFilters } from '@/features/sessions/session';
import { NO_SESSION_FILTERS } from '@/features/sessions/session';
import { makeToy } from '@/test/fixtures';
import { useSessionFilters } from '@/features/sessions/list/filter/useSessionFilters';

const toys = [
  makeToy({ id: 1, brand: 'Acme', name: 'Rare', size: 'M' }),
  makeToy({ id: 2, name: 'Favorite' }),
  makeToy({ id: 3, name: 'Unused' }),
];
const toysById = new Map(toys.map((toy) => [toy.id, toy]));

const renderFilters = (filters: SessionFilters = NO_SESSION_FILTERS, onChange = vi.fn()) => ({
  onChange,
  ...renderHook(
    ({ current }: { current: SessionFilters }) =>
      useSessionFilters({ toys, toysById, filter: 'all', filters: current, onChange }),
    { initialProps: { current: filters } },
  ),
});

describe('useSessionFilters', () => {
  beforeEach(() => {
    usageState.current = new Map([
      [1, 2],
      [2, 9],
    ]);
  });

  it('lists available toys by usage and hides unused ones', () => {
    const { result } = renderFilters();
    expect(result.current.availableToys.map((o) => o.toy.id)).toEqual([2, 1]);
    expect(result.current.availableToys.map((o) => o.uses)).toEqual([9, 2]);
  });

  it('splits selected toys out and toggles through onChange', () => {
    const { result, onChange } = renderFilters({ ...NO_SESSION_FILTERS, toyIds: [1] });
    expect(result.current.selectedToys.map((o) => o.toy.id)).toEqual([1]);
    expect(result.current.availableToys.map((o) => o.toy.id)).toEqual([2]);

    result.current.availableToys[0].toggle();
    expect(onChange).toHaveBeenCalledWith({ ...NO_SESSION_FILTERS, toyIds: [1, 2] });
  });

  it('filters available toys by the search query', () => {
    const { result } = renderFilters();
    act(() => result.current.setQuery('fav'));
    expect(result.current.availableToys.map((o) => o.toy.name)).toEqual(['Favorite']);
  });

  it('exposes flag options that toggle through onChange', () => {
    const { result, onChange } = renderFilters();
    const hasMedia = result.current.flags.find((f) => f.key === 'hasMedia');
    hasMedia?.toggle();
    expect(onChange).toHaveBeenCalledWith({ ...NO_SESSION_FILTERS, hasMedia: true });
  });

  it('builds one chip per active filter in toy, flag, time order', () => {
    const filters = { ...NO_SESSION_FILTERS, toyIds: [1, 99], hasPr: true, timeWindow: { from: 18, to: 20 } };
    const { result } = renderFilters(filters);
    expect(result.current.chips.map((c) => c.kind)).toEqual(['label', 'label', 'flag', 'time']);
    expect(result.current.chips[0]).toMatchObject({ label: 'Acme Rare M' });
    expect(result.current.chips[1]).toMatchObject({ label: '#99' });
    expect(result.current.chips[2]).toMatchObject({ labelKey: 'hasPr' });
    expect(result.current.chips[3]).toMatchObject({ from: 18, to: 20 });
  });

  it('removes the matching filter through a chip', () => {
    const filters = { ...NO_SESSION_FILTERS, toyIds: [1], timeWindow: { from: 18, to: 20 } };
    const { result, onChange } = renderFilters(filters);

    result.current.chips[0].remove();
    expect(onChange).toHaveBeenLastCalledWith({ ...filters, toyIds: [] });

    result.current.chips[1].remove();
    expect(onChange).toHaveBeenLastCalledWith({ ...filters, timeWindow: null });
  });

  it('shows the full day slider when no window is set and commits a narrowed one', () => {
    const { result, onChange } = renderFilters();
    expect(result.current.slider.value).toEqual([0, 24]);
    expect(result.current.slider.isFullDay).toBe(true);

    result.current.slider.onCommit([18, 20]);
    expect(onChange).toHaveBeenCalledWith({ ...NO_SESSION_FILTERS, timeWindow: { from: 18, to: 20 } });
  });

  it('commits a full-range release as clearing the window', () => {
    const { result, onChange } = renderFilters({ ...NO_SESSION_FILTERS, timeWindow: { from: 18, to: 20 } });
    result.current.slider.onCommit([0, 24]);
    expect(onChange).toHaveBeenCalledWith(NO_SESSION_FILTERS);
  });

  it('keeps the drag draft visible until the committed window catches up', () => {
    const { result, rerender, onChange } = renderFilters();
    act(() => result.current.slider.onDraft([18, 20]));
    expect(result.current.slider.value).toEqual([18, 20]);

    act(() => result.current.slider.onCommit([18, 20]));
    expect(result.current.slider.value).toEqual([18, 20]);

    rerender({ current: { ...NO_SESSION_FILTERS, timeWindow: { from: 18, to: 20 } } });
    expect(result.current.slider.value).toEqual([18, 20]);
    expect(result.current.slider.isFullDay).toBe(false);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('reverts an empty-window release', () => {
    const { result, onChange } = renderFilters();
    act(() => result.current.slider.onDraft([5, 5]));
    act(() => result.current.slider.onCommit([5, 5]));
    expect(onChange).not.toHaveBeenCalled();
    expect(result.current.slider.value).toEqual([0, 24]);
  });

  it('counts filters and clears them all', () => {
    const filters = { ...NO_SESSION_FILTERS, toyIds: [1], hasPr: true, timeWindow: { from: 6, to: 9 } };
    const { result, onChange } = renderFilters(filters);
    expect(result.current.count).toBe(3);
    expect(result.current.chips).toHaveLength(3);
    result.current.clearAll();
    expect(onChange).toHaveBeenCalledWith(NO_SESSION_FILTERS);
  });
});
