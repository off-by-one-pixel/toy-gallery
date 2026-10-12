import { Involvement, type SessionRecord, type Toy, type ToyRecord } from '@/api/types';
import { INVOLVEMENT_LEVELS, toyTooltip } from '@/features/sessions/session';
import { displayGirth, type Girth } from '@/features/preferences/girth';
import { formatValue, type Unit } from '@/features/preferences/units';
import { formatDuration } from '@/lib/duration';
import type { Translator } from '@/i18n/translator';

export type RecordPeak = 'length' | 'circumference' | 'duration';

export type RecordDisplayContext = Readonly<{
  t: Translator;
  girth: Girth;
  unit: Unit;
  locale: string;
}>;

export type RecordValue = Readonly<{ text: string; suffix?: string }>;

export type SessionRecordDisplay = Readonly<{
  peak?: RecordPeak;
  label: (ctx: RecordDisplayContext) => string;
  value: (value: number, ctx: RecordDisplayContext) => RecordValue;
}>;

const dimension = (mm: number, ctx: RecordDisplayContext): RecordValue => ({
  text: formatValue(mm, ctx.unit),
  suffix: ctx.unit.id,
});

const elapsed = (value: number, ctx: RecordDisplayContext): RecordValue => ({
  text: formatDuration(value, ctx.locale),
});

export const SESSION_RECORDS = {
  'pr-width': {
    peak: 'circumference',
    label: (ctx) => ctx.t(`session.records.width.${ctx.girth}`),
    value: (value, ctx) => dimension(displayGirth(value, ctx.girth) ?? value, ctx),
  },
  'pr-depth': {
    peak: 'length',
    label: (ctx) => ctx.t('session.records.depth'),
    value: dimension,
  },
  'pr-time': {
    peak: 'duration',
    label: (ctx) => ctx.t('session.records.plugged'),
    value: elapsed,
  },
  'pr-duration': {
    label: (ctx) => ctx.t('session.records.session'),
    value: elapsed,
  },
  'toy-time': {
    label: (ctx) => ctx.t('session.records.time'),
    value: elapsed,
  },
  'toy-level': {
    label: (ctx) => ctx.t('session.records.level'),
    value: (value, ctx) => ({
      text: ctx.t(`involvement.${INVOLVEMENT_LEVELS[value] ?? Involvement.USED}`),
    }),
  },
} as const satisfies Record<string, SessionRecordDisplay>;

export const recordDisplay = (key: string): SessionRecordDisplay | undefined =>
  key in SESSION_RECORDS ? SESSION_RECORDS[key as keyof typeof SESSION_RECORDS] : undefined;

export type RecordItem = Readonly<{ id: string; key: string; value: number; note?: string }>;

export const sessionRecordItems = (
  records: readonly SessionRecord[],
  toysById: ReadonlyMap<number, Toy>,
): RecordItem[] =>
  records.map((record) => {
    const toy = record.toy == null ? undefined : toysById.get(record.toy);
    return { id: `${record.key}-${record.toy}`, key: record.key, value: record.value, note: toy && toyTooltip(toy) };
  });

export const latestToyRecords = (records: readonly ToyRecord[]): ToyRecord[] => {
  const latest = new Map<string, ToyRecord>();
  for (const record of records) {
    if (!latest.has(record.key)) latest.set(record.key, record);
  }
  return [...latest.values()];
};

export const toyRecordItems = (records: readonly ToyRecord[], locale: string): RecordItem[] =>
  latestToyRecords(records).map((record) => ({
    id: record.key,
    key: record.key,
    value: record.value,
    note: new Date(record.achievedAt).toLocaleDateString(locale, { dateStyle: 'medium' }),
  }));
