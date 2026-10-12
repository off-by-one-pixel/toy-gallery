import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PeakRow from '@/features/sessions/list/PeakRow';
import { withAppProviders } from '@/test/render';

describe('PeakRow', () => {
  it('shows a dash when there is no value', () => {
    render(withAppProviders(<PeakRow label="Peak length" value={null} recordLabel="Longest" />));
    expect(screen.getByText('Peak length')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.queryByLabelText('Longest')).toBeNull();
  });

  it('shows the value with its record trophy', () => {
    render(withAppProviders(<PeakRow label="Peak length" value="120 mm" recordLabel="Longest" />));
    expect(screen.getByText('120 mm').className).toContain('text-foreground');
    expect(screen.getByLabelText('Longest')).toBeTruthy();
  });

  it('highlights a live value', () => {
    render(withAppProviders(<PeakRow label="Total time" value="12m 05s" live />));
    expect(screen.getByText('12m 05s').className).toContain('text-live-strong');
  });
});
