import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import en from '@/i18n/catalogs/en.json';
import type { ToyRecord } from '@/api/types';
import { withAppProviders } from '@/test/render';
import ToyRecordList, { latestToyRecords } from '@/features/toys/gallery/ToyRecordList';

const record = (key: string, value: number, achievedAt: string): ToyRecord => ({ key, value, achievedAt });

const rows: ToyRecord[] = [
  record('toy-level', 2, '2026-06-03T10:00:00Z'),
  record('toy-level', 1, '2026-06-01T10:00:00Z'),
  record('toy-time', 90, '2026-06-02T10:00:00Z'),
  record('toy-time', 30, '2026-06-01T10:00:00Z'),
];

describe('latestToyRecords', () => {
  it('keeps the first row per key in server order', () => {
    expect(latestToyRecords(rows).map((r) => [r.key, r.value])).toEqual([
      ['toy-level', 2],
      ['toy-time', 90],
    ]);
  });
});

describe('ToyRecordList', () => {
  it('shows only the latest record per key with registry labels and values', () => {
    render(withAppProviders(<ToyRecordList records={rows} />));

    expect(screen.getByText(en.session.records.level)).toBeTruthy();
    expect(screen.getByText(en.involvement.FULLY_INSERTED)).toBeTruthy();
    expect(screen.queryByText(en.involvement.INSERTED)).toBeNull();

    expect(screen.getByText(en.session.records.time)).toBeTruthy();
    expect(screen.getByText('1h 30m')).toBeTruthy();
    expect(screen.queryByText('30m')).toBeNull();
  });

  it('renders the achieved date of the latest row', () => {
    render(withAppProviders(<ToyRecordList records={[record('toy-time', 90, '2026-06-02T10:00:00Z')]} />));
    expect(screen.getByText(/Jun 2, 2026/)).toBeTruthy();
  });

  it('skips unknown keys and renders nothing without records', () => {
    const { container } = render(
      withAppProviders(<ToyRecordList records={[record('toy-mystery', 1, '2026-06-01T10:00:00Z')]} />),
    );
    expect(container.querySelector('ul')).toBeNull();
  });
});
