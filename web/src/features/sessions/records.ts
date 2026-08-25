import type { Girth } from '@/features/preferences/girth';

export type RecordPeak = 'length' | 'circumference';

export type RecordLabelContext = Readonly<{
  t: (key: string) => string;
  girth: Girth;
}>;

export type SessionRecordDisplay = Readonly<{
  peak: RecordPeak;
  label: (ctx: RecordLabelContext) => string;
}>;

export const SESSION_RECORDS = {
  'pr-width': {
    peak: 'circumference',
    label: (ctx) => ctx.t(ctx.girth === 'diameter' ? 'records.widthDiameter' : 'records.widthCircumference'),
  },
  'pr-depth': {
    peak: 'length',
    label: (ctx) => ctx.t('records.depth'),
  },
} as const satisfies Record<string, SessionRecordDisplay>;

export const recordDisplay = (key: string): SessionRecordDisplay | undefined =>
  key in SESSION_RECORDS ? SESSION_RECORDS[key as keyof typeof SESSION_RECORDS] : undefined;
