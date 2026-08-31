export const DURATION_INCREMENTS_MINUTES = [60, 30, 5, 1] as const;

type DurationUnit = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second';

const unitFormat = (locale: string, unit: DurationUnit, value: number, minimumIntegerDigits = 1): string =>
  new Intl.NumberFormat(locale, {
    style: 'unit',
    unit,
    unitDisplay: unit === 'month' ? 'short' : 'narrow',
    minimumIntegerDigits,
  }).format(value);

const ELAPSED_UNITS: readonly { unit: DurationUnit; minutes: number }[] = [
  { unit: 'year', minutes: 525_600 },
  { unit: 'month', minutes: 43_200 },
  { unit: 'day', minutes: 1_440 },
  { unit: 'hour', minutes: 60 },
  { unit: 'minute', minutes: 1 },
];

export const formatElapsed = (minutes: number, locale: string): string => {
  const parts: string[] = [];
  let remaining = Math.max(0, Math.floor(minutes));
  for (const { unit, minutes: size } of ELAPSED_UNITS) {
    const value = Math.floor(remaining / size);
    remaining -= value * size;
    if (value > 0 || unit === 'minute') parts.push(unitFormat(locale, unit, value));
  }
  return parts.join(' ');
};

export const formatElapsedSeconds = (seconds: number, locale: string): string => {
  const parts: string[] = [];
  let remaining = Math.max(0, Math.floor(seconds));
  for (const { unit, minutes: size } of ELAPSED_UNITS) {
    const value = Math.floor(remaining / (size * 60));
    remaining -= value * size * 60;
    if (value > 0 || parts.length > 0) parts.push(unitFormat(locale, unit, value));
  }
  parts.push(unitFormat(locale, 'second', remaining, 2));
  return parts.join(' ');
};

export const formatDuration = (minutes: number, locale: string): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${unitFormat(locale, 'hour', h)} ${unitFormat(locale, 'minute', m)}`;
  if (h > 0) return unitFormat(locale, 'hour', h);
  return unitFormat(locale, 'minute', m);
};

export const minutesBetween = (start: string, end: string): number =>
  Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);

export const secondsBetween = (start: string, end: string): number =>
  Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
