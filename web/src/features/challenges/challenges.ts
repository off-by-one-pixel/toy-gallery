import type { Challenge } from '@/api/types';
import { SESSION_RECORDS, type RecordDisplayContext, type RecordValue } from '@/features/sessions/records';
import { calendarDaysBetween } from '@/lib/dates';
import { formatDuration } from '@/lib/duration';

export type ChallengeDisplayContext = RecordDisplayContext & Readonly<{ now: Date }>;

export type ChallengeTarget = Readonly<{ label: string; value?: RecordValue }>;

type ChallengeDisplay = Readonly<{
  target: (challenge: Challenge, ctx: ChallengeDisplayContext) => ChallengeTarget;
  chips: (challenge: Challenge, ctx: ChallengeDisplayContext) => string[];
}>;

type RecordKey = keyof typeof SESSION_RECORDS;

const recordValue = (key: RecordKey, value: number | null, ctx: RecordDisplayContext): RecordValue | undefined =>
  value == null ? undefined : SESSION_RECORDS[key].value(value, ctx);

const recordText = (key: RecordKey, value: number | null, ctx: RecordDisplayContext): string => {
  const formatted = recordValue(key, value, ctx);
  if (!formatted) return '—';
  return formatted.suffix ? `${formatted.text} ${formatted.suffix}` : formatted.text;
};

const stepText = (challenge: Challenge, recordKey: RecordKey, ctx: RecordDisplayContext): string | null => {
  if (challenge.target == null || challenge.best == null) return null;
  return `+${recordText(recordKey, challenge.target - challenge.best, ctx)}`;
};

const recentUseChips = (challenge: Challenge, ctx: ChallengeDisplayContext): string[] => {
  if (!challenge.reasons.includes('recent-use') || !challenge.lastUsedAt) return [];
  const days = calendarDaysBetween(new Date(challenge.lastUsedAt), ctx.now);
  const when = new Intl.RelativeTimeFormat(ctx.locale, { numeric: 'auto' }).format(-days, 'day');
  return [ctx.t('challenge.chip.recentUse', { when })];
};

const sizeChips = (
  challenge: Challenge,
  ctx: ChallengeDisplayContext,
  stepKey: 'girthStep' | 'lengthStep',
  recordKey: RecordKey,
): string[] => {
  const step = stepText(challenge, recordKey, ctx);
  return [
    ...(step ? [ctx.t(`challenge.chip.${stepKey}`, { step })] : []),
    ctx.t('challenge.chip.best', { value: recordText(recordKey, challenge.best, ctx) }),
    ...recentUseChips(challenge, ctx),
  ];
};

const nearRecordChips = (challenge: Challenge, ctx: ChallengeDisplayContext): string[] => {
  if (!challenge.reasons.includes('near-record') || challenge.averageMinutes == null) return [];
  const average = formatDuration(Math.round(challenge.averageMinutes), ctx.locale);
  return [ctx.t('challenge.chip.nearRecord', { average, best: recordText('toy-time', challenge.best, ctx) })];
};

const notUsedSince = (challenge: Challenge, ctx: ChallengeDisplayContext): string[] => {
  if (!challenge.lastUsedAt) return [];
  const date = new Date(challenge.lastUsedAt).toLocaleDateString(ctx.locale, { month: 'short', year: 'numeric' });
  return [ctx.t('challenge.chip.notUsedSince', { date })];
};

export const CHALLENGE_DISPLAY: Record<Challenge['kind'], ChallengeDisplay> = {
  'new-toy': {
    target: (_, ctx) => ({ label: ctx.t('challenge.target.newToy') }),
    chips: (_, ctx) => [ctx.t('challenge.chip.new')],
  },
  girth: {
    target: (challenge, ctx) => ({
      label: ctx.t('challenge.target.girth'),
      value: recordValue('pr-width', challenge.target, ctx),
    }),
    chips: (challenge, ctx) => sizeChips(challenge, ctx, 'girthStep', 'pr-width'),
  },
  depth: {
    target: (challenge, ctx) => ({
      label: ctx.t('challenge.target.depth'),
      value: recordValue('pr-depth', challenge.target, ctx),
    }),
    chips: (challenge, ctx) => sizeChips(challenge, ctx, 'lengthStep', 'pr-depth'),
  },
  'old-toy': {
    target: (_, ctx) => ({ label: ctx.t('challenge.target.oldToy') }),
    chips: (challenge, ctx) => [
      ...notUsedSince(challenge, ctx),
      ctx.t('challenge.chip.sessions', { count: challenge.sessionCount }),
    ],
  },
  time: {
    target: (challenge, ctx) =>
      challenge.best == null
        ? { label: ctx.t('challenge.target.logTime') }
        : { label: ctx.t('challenge.target.time'), value: recordValue('toy-time', challenge.best, ctx) },
    chips: (challenge, ctx) => [...nearRecordChips(challenge, ctx), ...recentUseChips(challenge, ctx)],
  },
};
