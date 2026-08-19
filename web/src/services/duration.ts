export const DURATION_INCREMENTS_MINUTES = [60, 30, 5, 1] as const;

export const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

export const totalDuration = (entries: ReadonlyArray<{ durationMinutes?: number | null }>): number =>
  entries.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0);

export const minutesBetween = (start: string, end: string): number =>
  Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
