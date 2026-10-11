import { renderHook } from '@testing-library/react';
import { settle } from '@/test/wait';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  fetchSessionStats: vi.fn(),
}));

import { fetchSessionStats } from '@/api';
import { type Period } from '@/features/sessions/session';
import { withAppProviders } from '@/test/render';
import { useToyUsage } from '@/features/sessions/list/useToyUsage';

const wrapper = ({ children }: Readonly<{ children: React.ReactNode }>) => withAppProviders(children);

describe('useToyUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps per-toy usage counts for the filter window', async () => {
    vi.mocked(fetchSessionStats).mockResolvedValue([
      { key: '1', values: { count: 9 } },
      { key: '2', values: { count: 3 } },
    ]);
    const { result } = renderHook(() => useToyUsage({ kind: 'week', anchor: '2026-06-08' } as Period), { wrapper });
    await settle(() => expect(result.current.get(1)).toBe(9));
    expect(result.current.get(2)).toBe(3);
    expect(vi.mocked(fetchSessionStats).mock.calls[0].slice(0, 3)).toEqual([
      'toy',
      ['count'],
      { start: '2026-06-08', end: '2026-06-14' },
    ]);
  });

  it('returns an empty map before data arrives', () => {
    vi.mocked(fetchSessionStats).mockImplementation(() => new Promise(() => undefined));
    const { result } = renderHook(() => useToyUsage({ kind: 'all' } as Period), { wrapper });
    expect(result.current.size).toBe(0);
  });
});
