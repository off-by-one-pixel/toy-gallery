import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ActivityTracker from '@/features/sessions/stats/ActivityTracker';
import type { FrequencyView, StatViewItem } from '@/features/sessions/stats/statsView';

const calendar: StatViewItem = {
  kind: 'calendar',
  key: 'time',
  view: {
    title: 'Time per day',
    summary: '2h 5m',
    cells: [{ date: '2026-06-15', tooltip: 'Jun 15', fill: 'hsl(1, 1%, 1%)' }],
    startDate: new Date(2026, 5, 14),
    endDate: new Date(2026, 5, 15),
    legendGradient: 'linear-gradient(red, blue)',
    legendMinLabel: '30m',
    legendMaxLabel: '1h 35m',
  },
};

const frequency = (view: Partial<FrequencyView> = {}): StatViewItem => ({
  kind: 'frequency',
  key: 'weekday',
  view: {
    title: 'Weekday',
    emptyLabel: 'No sessions yet',
    total: 5,
    legendMin: 1,
    max: 4,
    legendGradient: 'linear-gradient(red, blue)',
    cells: [
      { key: 0, label: 'Mon', fill: 'red', tooltip: 'Mon: 4' },
      { key: 1, label: 'Tue', fill: 'blue', tooltip: 'Tue: 1' },
    ],
    ...view,
  },
});

describe('ActivityTracker', () => {
  it('renders a calendar stat with its title, summary and legend labels', () => {
    render(<ActivityTracker items={[calendar]} />);
    expect(screen.getByRole('heading', { name: 'Time per day' })).toBeTruthy();
    expect(screen.getByText('2h 5m')).toBeTruthy();
    expect(screen.getByText('30m')).toBeTruthy();
    expect(screen.getByText('1h 35m')).toBeTruthy();
  });

  it('renders a frequency stat with its buckets and legend range', () => {
    render(<ActivityTracker items={[frequency()]} />);
    expect(screen.getByRole('heading', { name: 'Weekday' })).toBeTruthy();
    expect(screen.getByText('Mon')).toBeTruthy();
    expect(screen.getByTitle('Tue: 1')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
  });

  it('shows the empty label instead of buckets for a frequency stat without data', () => {
    render(<ActivityTracker items={[frequency({ total: 0 })]} />);
    expect(screen.getByText('No sessions yet')).toBeTruthy();
    expect(screen.queryByText('Mon')).toBeNull();
  });
});
