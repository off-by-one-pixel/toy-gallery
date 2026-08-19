import { ACTIVITY_PALETTE } from './activityPalette';
import { displayGirth } from './girth';
import { METRIC_COUNT, METRIC_MAX_CIRCUMFERENCE, METRIC_MAX_LENGTH } from './stats';
import type { StatDef } from './statsView';

const REFERENCE_MONDAY = new Date(2001, 0, 1);

const hourLabel = (hour: number, locale: string): string =>
  new Date(2000, 0, 1, hour).toLocaleTimeString(locale, { hour: 'numeric' });

const dayLabel = (dow: number, locale: string): string =>
  new Date(REFERENCE_MONDAY.getFullYear(), 0, REFERENCE_MONDAY.getDate() + dow).toLocaleDateString(locale, {
    weekday: 'short',
  });

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
    tooltip: (hour, count, ctx) => ctx.t('session.timeOfDay.tooltip', { bucket: hourLabel(hour, ctx.locale), count }),
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
    bucketLabel: (dow, ctx) => dayLabel(dow, ctx.locale),
    tooltip: (dow, count, ctx) => ctx.t('session.weekday.tooltip', { bucket: dayLabel(dow, ctx.locale), count }),
  },
];
