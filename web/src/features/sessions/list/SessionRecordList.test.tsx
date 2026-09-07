// @vitest-environment happy-dom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import en from '@/i18n/catalogs/en.json';
import type { SessionRecord, Toy } from '@/api/types';
import { Unit } from '@/features/preferences/units';
import { makeToy } from '@/test/fixtures';
import { withAppProviders } from '@/test/render';
import SessionRecordList from '@/features/sessions/list/SessionRecordList';

const record = (key: string, value: number, toy: number | null = 1): SessionRecord =>
  ({ key, toy, value, achievedAt: '2026-06-01T21:00:00' }) as SessionRecord;

const renderList = (
  records: SessionRecord[],
  toys: Toy[] = [makeToy({ id: 1, brand: 'Acme', name: 'Steel', size: 'M' })],
) =>
  render(
    withAppProviders(
      <SessionRecordList records={records} toysById={new Map(toys.map((t) => [t.id, t]))} unit={Unit.mm} />,
    ),
  );

describe('SessionRecordList', () => {
  it('lists each record with its label, value and toy', () => {
    renderList([record('pr-width', 240), record('pr-depth', 180)]);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain(en.session.records.width.circumference);
    expect(items[0].textContent).toContain('240');
    expect(items[0].textContent).toContain('Acme Steel M');
    expect(items[1].textContent).toContain(en.session.records.depth);
    expect(items[1].textContent).toContain('180');
  });

  it('renders toy records with their own value formatting', () => {
    renderList([record('toy-time', 90), record('toy-level', 2)]);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain(en.session.records.time);
    expect(items[0].textContent).toContain('1h 30m');
    expect(items[0].textContent).not.toContain('mm');
    expect(items[1].textContent).toContain(en.session.records.level);
    expect(items[1].textContent).toContain(en.involvement.FULLY_INSERTED);
    expect(items[1].textContent).toContain('Acme Steel M');
  });

  it('renders session-wide records without a toy name', () => {
    renderList([record('pr-time', 45, null), record('pr-duration', 120, null)]);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain(en.session.records.plugged);
    expect(items[0].textContent).toContain('45m');
    expect(items[0].textContent).not.toContain('Acme');
    expect(items[1].textContent).toContain(en.session.records.session);
    expect(items[1].textContent).toContain('2h 0m');
  });

  it('keeps one row per toy for the same record key', () => {
    renderList(
      [record('toy-time', 30, 1), record('toy-time', 90, 2)],
      [makeToy({ id: 1, name: 'One' }), makeToy({ id: 2, name: 'Two' })],
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('skips records the frontend does not know about', () => {
    renderList([record('pr-width', 240), record('pr-future', 5)]);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('renders nothing without recognizable records', () => {
    const { container } = renderList([record('pr-future', 5)]);
    expect(container.innerHTML).toBe('');
  });

  it('omits the toy name when the toy is not loaded', () => {
    renderList([record('pr-width', 240, 99)]);
    expect(screen.getByRole('listitem').textContent).not.toContain('Steel');
  });
});
