import { Involvement } from '@/api/types';
import { displayGirth, type Girth } from '@/features/preferences/girth';
import { formatValue, type Unit } from '@/features/preferences/units';
import { formatElapsed } from '@/lib/duration';

export type RecordPeak = 'length' | 'circumference';

export type RecordDisplayContext = Readonly<{
  t: (key: string) => string;
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

const INVOLVEMENT_BY_RANK = [Involvement.USED, Involvement.INSERTED, Involvement.FULLY_INSERTED];

const dimension = (mm: number, ctx: RecordDisplayContext): RecordValue => ({
  text: formatValue(mm, ctx.unit),
  suffix: ctx.unit.id,
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
  'toy-time': {
    label: (ctx) => ctx.t('session.records.time'),
    value: (value, ctx) => ({ text: formatElapsed(value, ctx.locale) }),
  },
  'toy-level': {
    label: (ctx) => ctx.t('session.records.level'),
    value: (value, ctx) => ({
      text: ctx.t(`involvement.${INVOLVEMENT_BY_RANK[value] ?? Involvement.USED}`),
    }),
  },
} as const satisfies Record<string, SessionRecordDisplay>;

export const recordDisplay = (key: string): SessionRecordDisplay | undefined =>
  key in SESSION_RECORDS ? SESSION_RECORDS[key as keyof typeof SESSION_RECORDS] : undefined;
