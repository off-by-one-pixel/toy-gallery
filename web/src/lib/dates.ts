export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function localDateKey(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const daysAgoDateString = (days: number, now: Date = new Date()): string => {
  const shifted = new Date(now);
  shifted.setDate(shifted.getDate() - days);
  return localDateKey(shifted);
};

export const parseDateKey = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d ?? 1);
};

export const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const startOfWeek = (d: Date): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));

export const calendarDaysBetween = (from: Date, to: Date): number =>
  Math.floor((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY);

export function datetimeLocalValue(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${localDateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDateKey(key: string, locale: string): string {
  return parseDateKey(key).toLocaleDateString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export const localizedHourLabel = (hour: number, locale: string): string =>
  new Date(2000, 0, 1, hour).toLocaleTimeString(locale, { hour: 'numeric' });

const REFERENCE_MONDAY = new Date(2001, 0, 1);

export const localizedWeekdayLabel = (dow: number, locale: string): string =>
  new Date(REFERENCE_MONDAY.getFullYear(), 0, REFERENCE_MONDAY.getDate() + dow).toLocaleDateString(locale, {
    weekday: 'short',
  });

export function formatWhen(iso: string, now: Date, locale: string, t: (key: 'today' | 'yesterday') => string): string {
  const d = new Date(iso);
  const diffDays = calendarDaysBetween(d, now);
  const time = d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
  if (diffDays === 0) return `${t('today')} · ${time}`;
  if (diffDays === 1) return `${t('yesterday')} · ${time}`;
  const date = d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  return `${date} · ${time}`;
}
