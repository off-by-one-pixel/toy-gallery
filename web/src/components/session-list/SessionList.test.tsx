// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/sessions',
}));

vi.mock('../../services/api', () => ({
  fetchSessions: vi.fn(),
  fetchToys: vi.fn(),
  fetchActivity: vi.fn(),
  fetchMediaIndicators: vi.fn(),
  refreshAllSessionMedia: vi.fn(),
  fetchSessionMedia: vi.fn(),
  deleteSession: vi.fn(),
}));

import en from '../../i18n/catalogs/en.json';
import { AuthProvider } from '../../providers/AuthProvider';
import { GirthProvider } from '../../providers/GirthProvider';
import { PrivacyProvider } from '../../providers/PrivacyProvider';
import { ThemeProvider } from '../../providers/ThemeProvider';
import { UnitProvider } from '../../providers/UnitProvider';
import {
  fetchActivity,
  fetchMediaIndicators,
  fetchSessionMedia,
  fetchSessions,
  fetchToys,
  refreshAllSessionMedia,
} from '../../services/api';
import type { Session } from '../../services/types';
import SessionList from './SessionList';

const session = (id: number, startedAt: string): Session => ({
  id,
  startedAt,
  entries: [],
  maxInsertableLength: 120,
  maxCircumference: 110,
});

const wrap = (ui: React.ReactNode) => (
  <NextIntlClientProvider locale="en" messages={en}>
    <ThemeProvider>
      <UnitProvider>
        <GirthProvider>
          <PrivacyProvider>
            <AuthProvider>{ui}</AuthProvider>
          </PrivacyProvider>
        </GirthProvider>
      </UnitProvider>
    </ThemeProvider>
  </NextIntlClientProvider>
);

describe('SessionList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(fetchSessions).mockResolvedValue([session(1, '2026-06-01T20:00:00'), session(2, '2026-06-05T09:00:00')]);
    vi.mocked(fetchToys).mockResolvedValue([]);
    vi.mocked(fetchActivity).mockResolvedValue([]);
    vi.mocked(fetchMediaIndicators).mockResolvedValue({ configured: true, sessionIds: new Set([2]) });
    vi.mocked(fetchSessionMedia).mockResolvedValue({ configured: false, items: [] });
  });

  it('renders a row per session and a media badge for flagged sessions', async () => {
    render(wrap(<SessionList />));
    await screen.findByText(`2 ${en.session.recorded}`);
    const rows = screen.getAllByRole('button').filter((el) => el.className.includes('cursor-pointer'));
    expect(rows).toHaveLength(2);
    expect(screen.getAllByLabelText(en.session.media.indicatorLabel)).toHaveLength(1);
  });

  it('shows the media refresh button only when configured and refreshes on press', async () => {
    vi.mocked(refreshAllSessionMedia).mockResolvedValue({ configured: true, sessionIds: new Set([1, 2]) });
    render(wrap(<SessionList />));
    const button = await screen.findByRole('button', { name: en.session.media.refreshButton });
    fireEvent.click(button);
    await waitFor(() => expect(refreshAllSessionMedia).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getAllByLabelText(en.session.media.indicatorLabel)).toHaveLength(2));
  });

  it('hides the refresh button when media is not configured', async () => {
    vi.mocked(fetchMediaIndicators).mockResolvedValue({ configured: false, sessionIds: new Set() });
    render(wrap(<SessionList />));
    await screen.findByText(`2 ${en.session.recorded}`);
    expect(screen.queryByRole('button', { name: en.session.media.refreshButton })).toBeNull();
  });

  it('selects a row on click and toggles it back on Enter', async () => {
    render(wrap(<SessionList />));
    await screen.findByText(`2 ${en.session.recorded}`);
    const rows = screen.getAllByRole('button').filter((el) => el.className.includes('cursor-pointer'));
    expect(rows.length).toBe(2);

    fireEvent.click(rows[0]);
    expect(rows[0].className).toContain('ring-accent');

    fireEvent.keyDown(rows[0], { key: 'Enter' });
    expect(rows[0].className).not.toContain('ring-accent');

    fireEvent.keyDown(rows[0], { key: ' ' });
    expect(rows[0].className).toContain('ring-accent');
  });
});
