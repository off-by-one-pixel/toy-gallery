import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/toys/useToys', () => ({
  useToys: () => ({ toys: [], updateToy: vi.fn() }),
}));

import en from '@/i18n/catalogs/en.json';
import { makeToy } from '@/test/fixtures';
import { withAppProviders } from '@/test/render';
import { TOY_SORT } from '@/features/toys/toySort';
import ToyList from '@/features/toys/gallery/ToyList';

const renderList = (sort: { column: string; direction: 'asc' | 'desc' } | null) => {
  if (sort) localStorage.setItem(TOY_SORT.storageKey, JSON.stringify(sort));
  const toy = makeToy({ id: 1, name: 'Steel', usageCount: 7 } as never);
  const onToggleOpen = vi.fn();
  const actions = { onEdit: vi.fn(), onCopy: vi.fn(), onDelete: vi.fn() };
  render(
    withAppProviders(<ToyList toys={[toy]} openToyId={null} onToggleOpen={onToggleOpen} actions={actions} />, {
      sort: TOY_SORT,
    }),
  );
  return { toy, onToggleOpen, actions };
};

describe('ToyList sort column', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adds a column for a sort property that has no column of its own', () => {
    renderList({ column: 'popularity', direction: 'desc' });
    expect(screen.getByRole('button', { name: en.sort.column.popularity })).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
  });

  it('keeps the base columns when sorting by an always-visible property', () => {
    renderList({ column: 'insertable', direction: 'asc' });
    expect(screen.queryByRole('button', { name: en.sort.column.popularity })).toBeNull();
  });
});

describe('ToyList rows', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('toggles a row from its body but not from its action buttons', () => {
    const { toy, onToggleOpen, actions } = renderList(null);
    fireEvent.click(screen.getByRole('button', { name: en.common.edit }));
    expect(actions.onEdit).toHaveBeenCalledWith(toy);
    expect(onToggleOpen).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Steel'));
    expect(onToggleOpen).toHaveBeenCalledWith(1);
  });
});
