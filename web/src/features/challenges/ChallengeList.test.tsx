import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api')>()),
  fetchChallenges: vi.fn(),
  fetchToys: vi.fn(),
}));

import { fetchChallenges, fetchToys } from '@/api';
import type { Challenge } from '@/api/types';
import ChallengeList from '@/features/challenges/ChallengeList';
import en from '@/i18n/catalogs/en.json';
import { makeToy } from '@/test/fixtures';
import { withAppProviders } from '@/test/render';
import { settle } from '@/test/wait';

const challenge = (overrides: Partial<Challenge>): Challenge => ({
  kind: 'new-toy',
  toy: 1,
  points: 10,
  target: null,
  best: null,
  reasons: [],
  sessionCount: 0,
  lastUsedAt: null,
  averageMinutes: null,
  ...overrides,
});

const renderList = () => render(withAppProviders(<ChallengeList />));

describe('ChallengeList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchToys).mockResolvedValue([
      makeToy({ id: 1, brand: 'Acme', name: 'Fresh', size: 'M' }),
      makeToy({ id: 2, brand: 'Acme', name: 'Wide' }),
    ]);
  });

  it('lists the challenges in the order the API ranks them', async () => {
    vi.mocked(fetchChallenges).mockResolvedValue([
      challenge({ kind: 'new-toy', toy: 1 }),
      challenge({ kind: 'girth', toy: 2, points: 5, target: 205, best: 200, sessionCount: 3 }),
    ]);
    renderList();
    const list = await screen.findByRole('list', { name: en.challenge.listLabel });
    const rows = within(list).getAllByRole('listitem');
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/First session\s?AcmeFreshM/),
      expect.stringContaining('Insert205mmAcmeWide'),
    ]);
  });

  it('skips a challenge whose toy is not in the collection', async () => {
    vi.mocked(fetchChallenges).mockResolvedValue([challenge({ toy: 1 }), challenge({ toy: 99 })]);
    renderList();
    const list = await screen.findByRole('list', { name: en.challenge.listLabel });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
  });

  it('explains how to get challenges when there are none', async () => {
    vi.mocked(fetchChallenges).mockResolvedValue([]);
    renderList();
    await settle(() => expect(screen.getByText(en.challenge.empty)).toBeTruthy());
  });
});
