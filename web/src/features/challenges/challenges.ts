import type { Challenge } from '@/api/types';
import { SESSION_RECORDS, type RecordDisplayContext, type RecordValue } from '@/features/sessions/records';
import { calendarDaysBetween } from '@/lib/dates';
import { formatDuration } from '@/lib/duration';

export type ChallengeDisplayContext = RecordDisplayContext & Readonly<{ now: Date }>;

export type ChallengeTarget = Readonly<{ label: string; value?: RecordValue; detail?: string }>;

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

const sizeTarget = (
  challenge: Challenge,
  label: string,
  recordKey: RecordKey,
  ctx: RecordDisplayContext,
): ChallengeTarget => ({
  label,
  value: recordValue(recordKey, challenge.target, ctx),
  detail:
    challenge.target == null || challenge.best == null
      ? undefined
      : `+${recordText(recordKey, challenge.target - challenge.best, ctx)}`,
});

const recentUseChips = (challenge: Challenge, ctx: ChallengeDisplayContext): string[] => {
  if (!challenge.reasons.includes('recent-use') || !challenge.lastUsedAt) return [];
  const days = calendarDaysBetween(new Date(challenge.lastUsedAt), ctx.now);
  const when = new Intl.RelativeTimeFormat(ctx.locale, { numeric: 'auto' }).format(-days, 'day');
  return [ctx.t('challenge.chip.recentUse', { when })];
};

const sizeChips = (challenge: Challenge, ctx: ChallengeDisplayContext, recordKey: RecordKey): string[] => [
  ctx.t('challenge.chip.best', { value: recordText(recordKey, challenge.best, ctx) }),
  ...recentUseChips(challenge, ctx),
];

const timeTarget = (challenge: Challenge, ctx: ChallengeDisplayContext): ChallengeTarget => {
  if (challenge.best == null) return { label: ctx.t('challenge.target.logTime') };
  const average =
    challenge.averageMinutes == null ? null : formatDuration(Math.round(challenge.averageMinutes), ctx.locale);
  return {
    label: ctx.t('challenge.target.time'),
    value: recordValue('toy-time', challenge.best, ctx),
    detail: average == null ? undefined : ctx.t('challenge.target.average', { average }),
  };
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
    target: (challenge, ctx) => sizeTarget(challenge, ctx.t('challenge.target.girth'), 'pr-width', ctx),
    chips: (challenge, ctx) => sizeChips(challenge, ctx, 'pr-width'),
  },
  depth: {
    target: (challenge, ctx) => sizeTarget(challenge, ctx.t('challenge.target.depth'), 'pr-depth', ctx),
    chips: (challenge, ctx) => sizeChips(challenge, ctx, 'pr-depth'),
  },
  'old-toy': {
    target: (_, ctx) => ({ label: ctx.t('challenge.target.oldToy') }),
    chips: (challenge, ctx) => [
      ...notUsedSince(challenge, ctx),
      ctx.t('challenge.chip.sessions', { count: challenge.sessionCount }),
    ],
  },
  time: {
    target: timeTarget,
    chips: recentUseChips,
  },
};
