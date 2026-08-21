import { ACTIVITY_PALETTE } from '@/features/sessions/stats/activityPalette';
import { localizedHourLabel, localizedWeekdayLabel } from '@/lib/dates';
import { displayGirth } from '@/services/girth';
import type { StatDef } from '@/features/sessions/stats/statsView';

export const METRIC_COUNT = 'count';
export const METRIC_MAX_LENGTH = 'max:insertable_length';
export const METRIC_MAX_CIRCUMFERENCE = 'max:circumference';

export const SESSION_STATS: readonly StatDef[] = [
  {
    kind: 'calendar',
    key: 'length',
    groupBy: 'date',
    window: 'year',
    metric: METRIC_MAX_LENGTH,
    hue: ACTIVITY_PALETTE.lengthHue,
    title: (ctx) => ctx.t('common.length'),
  },
  {
    kind: 'calendar',
    key: 'girth',
    groupBy: 'date',
    window: 'year',
    metric: METRIC_MAX_CIRCUMFERENCE,
    hue: ACTIVITY_PALETTE.circumferenceHue,
    title: (ctx) => ctx.t(`common.${ctx.girth}`),
    value: (raw, ctx) => displayGirth(raw, ctx.girth),
  },
  {
    kind: 'calendar',
    key: 'sessions-per-day',
    groupBy: 'date',
    window: 'year',
    metric: METRIC_COUNT,
    hue: ACTIVITY_PALETTE.sessionsHue,
    gamma: ACTIVITY_PALETTE.sessionsGamma,
    title: (ctx) => ctx.t('session.perDayTitle'),
    formatLegend: (value) => `${Math.round(value)}`,
  },
  {
    kind: 'frequency',
    key: 'time-of-day',
    groupBy: 'hour',
    window: 'filter',
    metric: METRIC_COUNT,
    size: 24,
    hue: ACTIVITY_PALETTE.timeOfDayHue,
    gamma: ACTIVITY_PALETTE.sessionsGamma,
    minPolicy: 'zero',
    title: (ctx) => ctx.t('session.timeOfDay.title'),
    empty: (ctx) => ctx.t('session.timeOfDay.empty'),
    bucketLabel: (hour) => hour,
    tooltip: (hour, count, ctx) =>
      ctx.t('session.timeOfDay.tooltip', { bucket: localizedHourLabel(hour, ctx.locale), count }),
  },
  {
    kind: 'frequency',
    key: 'weekday',
    groupBy: 'weekday',
    window: 'filter',
    metric: METRIC_COUNT,
    size: 7,
    hue: ACTIVITY_PALETTE.weekdayHue,
    gamma: ACTIVITY_PALETTE.sessionsGamma,
    minPolicy: 'nonzeroMin',
    title: (ctx) => ctx.t('session.weekday.title'),
    empty: (ctx) => ctx.t('session.weekday.empty'),
    bucketLabel: (dow, ctx) => localizedWeekdayLabel(dow, ctx.locale),
    tooltip: (dow, count, ctx) =>
      ctx.t('session.weekday.tooltip', { bucket: localizedWeekdayLabel(dow, ctx.locale), count }),
  },
];
