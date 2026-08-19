export const DURATION_INCREMENTS_MINUTES = [60, 30, 5, 1] as const;

const unitFormat = (locale: string, unit: 'hour' | 'minute', value: number): string =>
  new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'narrow' }).format(value);

export const formatDuration = (minutes: number, locale: string): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${unitFormat(locale, 'hour', h)} ${unitFormat(locale, 'minute', m)}`;
  if (h > 0) return unitFormat(locale, 'hour', h);
  return unitFormat(locale, 'minute', m);
};

export const totalDuration = (entries: ReadonlyArray<{ durationMinutes?: number | null }>): number =>
  entries.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0);

export const minutesBetween = (start: string, end: string): number =>
  Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
