import { describe, expect, it } from 'vitest';

import { formatDuration, formatElapsed, formatElapsedSeconds, minutesBetween, secondsBetween } from '@/lib/duration';

describe('formatDuration', () => {
  it('formats minutes only', () => {
    expect(formatDuration(45, 'en')).toBe('45m');
    expect(formatDuration(0, 'en')).toBe('0m');
  });

  it('formats whole hours without a minutes part', () => {
    expect(formatDuration(60, 'en')).toBe('1h');
    expect(formatDuration(120, 'en')).toBe('2h');
  });

  it('formats mixed hours and minutes', () => {
    expect(formatDuration(95, 'en')).toBe('1h 35m');
  });

  it('localizes unit labels', () => {
    expect(formatDuration(95, 'ru')).toBe('1 ч 35 мин');
  });
});

describe('formatElapsed', () => {
  it('always shows the minutes component', () => {
    expect(formatElapsed(0, 'en')).toBe('0m');
    expect(formatElapsed(45, 'en')).toBe('45m');
    expect(formatElapsed(95, 'en')).toBe('1h 35m');
    expect(formatElapsed(120, 'en')).toBe('2h 0m');
  });

  it('rolls into days, skipping zero units above minutes', () => {
    expect(formatElapsed(2 * 1440 + 5 * 60, 'en')).toBe('2d 5h 0m');
    expect(formatElapsed(1440 + 30, 'en')).toBe('1d 30m');
    expect(formatElapsed(1440 + 60 + 5, 'en')).toBe('1d 1h 5m');
  });

  it('rolls into months and years', () => {
    expect(formatElapsed(40 * 1440, 'en')).toBe('1 mth 10d 0m');
    expect(formatElapsed(400 * 1440 + 90, 'en')).toBe('1y 1 mth 5d 1h 30m');
  });

  it('localizes unit labels', () => {
    expect(formatElapsed(2 * 1440 + 5 * 60, 'ru')).toBe('2 д. 5 ч 0 мин');
  });
});

describe('minutesBetween', () => {
  it('computes the span within a day', () => {
    expect(minutesBetween('2026-05-02T21:00', '2026-05-02T21:45')).toBe(45);
  });

  it('computes overnight spans across midnight', () => {
    expect(minutesBetween('2026-05-02T22:15', '2026-05-03T07:30')).toBe(555);
  });

  it('is negative when end precedes start', () => {
    expect(minutesBetween('2026-05-02T22:15', '2026-05-02T20:00')).toBeLessThan(0);
  });
});

describe('formatElapsedSeconds', () => {
  it('shows bare seconds under a minute', () => {
    expect(formatElapsedSeconds(45, 'en')).toBe('45s');
    expect(formatElapsedSeconds(0, 'en')).toBe('00s');
  });

  it('shows minutes with seconds', () => {
    expect(formatElapsedSeconds(33 * 60 + 12, 'en')).toBe('33m 12s');
  });

  it('keeps zero middle units once a larger unit appears', () => {
    expect(formatElapsedSeconds(3600 + 5, 'en')).toBe('1h 0m 05s');
  });

  it('clamps negative input to zero', () => {
    expect(formatElapsedSeconds(-30, 'en')).toBe('00s');
  });
});

describe('secondsBetween', () => {
  it('returns whole seconds between two timestamps', () => {
    expect(secondsBetween('2026-08-31T12:00:00', '2026-08-31T12:00:42')).toBe(42);
  });
});
