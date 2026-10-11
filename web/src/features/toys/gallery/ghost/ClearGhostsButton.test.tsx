import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import en from '@/i18n/catalogs/en.json';
import ClearGhostsButton from '@/features/toys/gallery/ghost/ClearGhostsButton';
import { withAppProviders } from '@/test/render';

describe('ClearGhostsButton', () => {
  it('renders nothing when there are no ghosts', () => {
    render(withAppProviders(<ClearGhostsButton count={0} onClear={vi.fn()} />));
    expect(screen.queryByText(en.toy.ghost.clearAll)).toBeNull();
  });

  it('shows the comparison count and clears all ghosts on click', () => {
    const onClear = vi.fn();
    render(withAppProviders(<ClearGhostsButton count={2} onClear={onClear} />));
    expect(screen.getByText('2 comparisons')).toBeTruthy();
    fireEvent.click(screen.getByText(en.toy.ghost.clearAll));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
