import { describe, expect, it } from 'vitest';

import { formatDuration, minutesBetween, secondsBetween } from '@/lib/duration';

describe('formatDuration', () => {
  it('formats minutes only', () => {
    expect(formatDuration(45, 'en')).toBe('45m');
    expect(formatDuration(0, 'en')).toBe('0m');
  });

  it('formats mixed hours and minutes', () => {
    expect(formatDuration(95, 'en')).toBe('1h 35m');
  });

  it('skips zero parts', () => {
    expect(formatDuration(60, 'en')).toBe('1h');
    expect(formatDuration(120, 'en')).toBe('2h');
    expect(formatDuration(2 * 1440 + 5 * 60, 'en')).toBe('2d 5h');
    expect(formatDuration(1440 + 30, 'en')).toBe('1d 30m');
  });

  it('rolls into days, months and years', () => {
    expect(formatDuration(1440 + 60 + 5, 'en')).toBe('1d 1h 5m');
    expect(formatDuration(40 * 1440, 'en')).toBe('1 mth 10d');
    expect(formatDuration(400 * 1440 + 90, 'en')).toBe('1y 1 mth 5d 1h 30m');
  });

  it('clamps negative input to zero', () => {
    expect(formatDuration(-30, 'en')).toBe('0m');
  });

  it('localizes unit labels', () => {
    expect(formatDuration(95, 'ru')).toBe('1 ч 35 мин');
    expect(formatDuration(2 * 1440 + 5 * 60, 'ru')).toBe('2 д. 5 ч');
  });

  describe('in seconds', () => {
    it('shows bare seconds under a minute', () => {
      expect(formatDuration(45, 'en', 'second')).toBe('45s');
      expect(formatDuration(0, 'en', 'second')).toBe('00s');
    });

    it('shows minutes with seconds', () => {
      expect(formatDuration(33 * 60 + 12, 'en', 'second')).toBe('33m 12s');
    });

    it('skips zero parts but always shows padded seconds', () => {
      expect(formatDuration(3600 + 5, 'en', 'second')).toBe('1h 05s');
      expect(formatDuration(10 * 60, 'en', 'second')).toBe('10m 00s');
    });

    it('clamps negative input to zero', () => {
      expect(formatDuration(-30, 'en', 'second')).toBe('00s');
    });
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

describe('secondsBetween', () => {
  it('returns whole seconds between two timestamps', () => {
    expect(secondsBetween('2026-08-31T12:00:00', '2026-08-31T12:00:42')).toBe(42);
  });
});
