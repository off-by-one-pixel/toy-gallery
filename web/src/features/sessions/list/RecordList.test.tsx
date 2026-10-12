import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import en from '@/i18n/catalogs/en.json';
import RecordList from '@/features/sessions/list/RecordList';
import type { RecordItem } from '@/features/sessions/records';
import { withAppProviders } from '@/test/render';

const item = (key: string, value: number, note?: string): RecordItem => ({ id: key, key, value, note });

const renderList = (items: RecordItem[]) =>
  render(withAppProviders(<RecordList items={items} className="extra" noteClassName="note" />));

describe('RecordList', () => {
  it('lists each record with its registry label, formatted value and note', () => {
    renderList([item('pr-width', 240, 'Acme Steel M'), item('pr-depth', 180)]);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain(en.session.records.width.circumference);
    expect(items[0].textContent).toContain('240');
    expect(screen.getByText('Acme Steel M').className).toBe('note');
    expect(items[1].textContent).toContain(en.session.records.depth);
    expect(items[1].textContent).toContain('180');
  });

  it('formats time and level records without a unit suffix', () => {
    renderList([item('toy-time', 90), item('toy-level', 2)]);
    const items = screen.getAllByRole('listitem');
    expect(items[0].textContent).toContain(en.session.records.time);
    expect(items[0].textContent).toContain('1h 30m');
    expect(items[0].textContent).not.toContain('mm');
    expect(items[1].textContent).toContain(en.involvement.FULLY_INSERTED);
  });

  it('skips records the frontend does not know about', () => {
    renderList([item('pr-width', 240), item('pr-future', 5)]);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('renders nothing without recognizable records', () => {
    const { container } = renderList([item('pr-future', 5)]);
    expect(container.innerHTML).toBe('');
  });
});
