import { describe, expect, it } from 'vitest';

import { formatDuration, minutesBetween } from '@/lib/duration';

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
