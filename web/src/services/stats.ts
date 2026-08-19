export const METRIC_COUNT = 'count';
export const METRIC_MAX_LENGTH = 'max:insertable_length';
export const METRIC_MAX_CIRCUMFERENCE = 'max:circumference';

export const localDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const daysAgoDateString = (days: number, now: Date = new Date()): string => {
  const shifted = new Date(now);
  shifted.setDate(shifted.getDate() - days);
  return localDateString(shifted);
};
