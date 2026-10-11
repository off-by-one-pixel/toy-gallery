export const DURATION_INCREMENTS_MINUTES = [60, 30, 5, 1] as const;

const UNIT_SECONDS = {
  year: 31_536_000,
  month: 2_592_000,
  day: 86_400,
  hour: 3_600,
  minute: 60,
  second: 1,
} as const;

type DurationUnit = keyof typeof UNIT_SECONDS;

const UNITS = Object.keys(UNIT_SECONDS) as DurationUnit[];

const unitFormat = (locale: string, unit: DurationUnit, value: number): string =>
  new Intl.NumberFormat(locale, {
    style: 'unit',
    unit,
    unitDisplay: unit === 'month' ? 'short' : 'narrow',
    minimumIntegerDigits: unit === 'second' ? 2 : 1,
  }).format(value);

export const formatDuration = (value: number, locale: string, unit: 'minute' | 'second' = 'minute'): string => {
  const parts: string[] = [];
  let remaining = Math.max(0, Math.floor(value)) * UNIT_SECONDS[unit];
  for (const part of UNITS.slice(0, UNITS.indexOf(unit) + 1)) {
    const count = Math.floor(remaining / UNIT_SECONDS[part]);
    remaining %= UNIT_SECONDS[part];
    if (count > 0 || part === 'second') parts.push(unitFormat(locale, part, count));
  }
  return parts.length > 0 ? parts.join(' ') : unitFormat(locale, unit, 0);
};

export const minutesBetween = (start: string, end: string): number =>
  Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);

export const secondsBetween = (start: string, end: string): number =>
  Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
