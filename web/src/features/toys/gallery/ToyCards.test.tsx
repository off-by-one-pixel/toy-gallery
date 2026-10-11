import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/toys/useToys', () => ({
  useToys: () => ({ updateToy: vi.fn() }),
}));

vi.mock('@/features/toys/gallery/useAttributeSuggestions', () => ({
  useAttributeSuggestions: () => ({
    keySuggestions: [],
    valuesFor: () => [],
    invalidateSuggestions: vi.fn(),
  }),
}));

import en from '@/i18n/catalogs/en.json';
import type { Toy } from '@/api/types';
import { TOY_SORT } from '@/features/toys/toySort';
import type { GhostToy } from '@/features/toys/gallery/ghost/ghosts';
import ToyCards from '@/features/toys/gallery/ToyCards';
import { makeToy } from '@/test/fixtures';
import { withAppProviders } from '@/test/render';

const toy = (id: number, name: string, circumference: number, insertableLength: number): Toy =>
  makeToy({
    id,
    brand: 'Acme',
    name,
    size: 'M',
    color: '#c4b5fd',
    circumference,
    insertableLength,
    totalLength: insertableLength + 30,
    customAttributes: {},
    shape: {
      topSectionShape: 'EGG',
      bottomSectionShape: 'FLAT',
      sections: [{ order: 0, diameter: 45, height: insertableLength }],
    },
  } as unknown as Partial<Toy>);

const ghost = (id: number, circumference: number, insertableLength: number): GhostToy => ({
  id,
  sourceName: 'Acme Slim M',
  circumference,
  insertableLength,
  shape: {
    topSectionShape: 'EGG',
    bottomSectionShape: 'FLAT',
    sections: [{ order: 0, diameter: 45, height: 150 }],
  } as GhostToy['shape'],
});

const noop = () => undefined;

const renderCards = (props: Partial<React.ComponentProps<typeof ToyCards>> = {}) => {
  const handlers = {
    onToggleOpen: noop,
    onEdit: noop,
    onCopy: noop,
    onDelete: noop,
    onGhost: vi.fn(),
    onEditGhost: vi.fn(),
    onRemoveGhost: vi.fn(),
    onClearGhosts: vi.fn(),
    onNew: noop,
  };
  render(
    withAppProviders(
      <ToyCards
        toys={[toy(1, 'Small', 100, 130), toy(2, 'Big', 160, 190)]}
        ghosts={[]}
        openToyId={null}
        {...handlers}
        {...props}
      />,
      { sort: TOY_SORT },
    ),
  );
  return handlers;
};

describe('ToyCards ghosts', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders a ghost card with its origin and dimensions', () => {
    renderCards({ ghosts: [ghost(1, 140, 165)] });
    expect(screen.getAllByText(en.toy.ghost.badge).length).toBeGreaterThan(0);
    expect(screen.getByText('from Acme Slim M')).toBeTruthy();
    expect(screen.getAllByText(/140 × 165/).length).toBeGreaterThan(0);
  });

  it('sorts the ghost into the grid position of the active dimension sort', () => {
    localStorage.setItem('gallery.sort', JSON.stringify({ column: 'circumference', direction: 'asc' }));
    renderCards({ ghosts: [ghost(1, 140, 165)] });
    const follows = (first: Element, second: Element) =>
      Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
    const ghostCard = screen.getByText('from Acme Slim M');
    expect(follows(screen.getByText('Small'), ghostCard)).toBe(true);
    expect(follows(ghostCard, screen.getByText('Big'))).toBe(true);
  });

  it('wires ghost card removal and editing', () => {
    const handlers = renderCards({ ghosts: [ghost(5, 140, 165)] });
    fireEvent.click(screen.getByLabelText(en.toy.ghost.remove));
    expect(handlers.onRemoveGhost).toHaveBeenCalledWith(5);

    fireEvent.click(screen.getByLabelText(en.toy.ghost.editHint));
    expect(handlers.onEditGhost).toHaveBeenCalledWith(ghost(5, 140, 165));
  });

  it('shows the clear-all pill only when ghosts exist and wires it', () => {
    const bare = renderCards();
    expect(screen.queryByText(en.toy.ghost.clearAll)).toBeNull();
    expect(bare.onClearGhosts).not.toHaveBeenCalled();
  });

  it('clears all ghosts from the pill', () => {
    const handlers = renderCards({ ghosts: [ghost(1, 140, 165), ghost(2, 150, 175)] });
    fireEvent.click(screen.getByText(en.toy.ghost.clearAll));
    expect(handlers.onClearGhosts).toHaveBeenCalledTimes(1);
  });

  it('offers the compare action on every toy card', () => {
    const handlers = renderCards();
    const buttons = screen.getAllByLabelText(en.common.compare);
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[0]);
    expect(handlers.onGhost).toHaveBeenCalledTimes(1);
  });

  it('hides the compare action when onGhost is not provided', () => {
    renderCards({ onGhost: undefined });
    expect(screen.queryByLabelText(en.common.compare)).toBeNull();
  });

  it('annotates each toy card metric with signed deltas against the ghost', () => {
    renderCards({ ghosts: [ghost(1, 140, 165)] });
    expect(screen.getByText('+35')).toBeTruthy();
    expect(screen.getByText('+40')).toBeTruthy();
    expect(screen.getByText('-25')).toBeTruthy();
    expect(screen.getByText('-20')).toBeTruthy();
  });

  it('highlights girth increases beyond half an inch as dangerous', () => {
    renderCards({ ghosts: [ghost(1, 140, 165)] });
    expect(screen.getByText('+40').className).toContain('bg-danger/15');
    expect(screen.getByText('-20').className).not.toContain('bg-danger/15');
    expect(screen.getByText('+35').className).not.toContain('bg-danger/15');
    expect(screen.getByText('-25').className).not.toContain('bg-danger/15');
  });
});
