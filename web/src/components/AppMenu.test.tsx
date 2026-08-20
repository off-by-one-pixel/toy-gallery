// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('../services/api', () => ({
  fetchMediaIndicators: vi.fn(),
  refreshAllSessionMedia: vi.fn(),
  MEDIA_INDICATORS_CHANGED_EVENT: 'mediaIndicatorsChanged',
  login: vi.fn(),
}));

globalThis.CSS ??= { escape: (value: string) => value } as unknown as typeof CSS;

import en from '../i18n/catalogs/en.json';
import { AuthProvider } from '../providers/AuthProvider';
import { fetchMediaIndicators, refreshAllSessionMedia } from '../services/api';
import { QueryWrapper } from '../test/QueryWrapper';
import AppMenu from './AppMenu';

const wrap = (
  <NextIntlClientProvider locale="en" messages={en}>
    <QueryWrapper>
      <AuthProvider>
        <AppMenu />
      </AuthProvider>
    </QueryWrapper>
  </NextIntlClientProvider>
);

describe('AppMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('omits the refresh-media item when media is not configured', async () => {
    vi.mocked(fetchMediaIndicators).mockResolvedValue({ configured: false, sessionIds: new Set() });
    render(wrap);
    await waitFor(() => expect(fetchMediaIndicators).toHaveBeenCalled());
    fireEvent.click(screen.getByLabelText(en.collection.menu.openMenu));
    await screen.findByText(en.collection.menu.settingsLabel);
    expect(screen.queryByText(en.session.media.refreshButtonLabel)).toBeNull();
  });

  it('refreshes media and broadcasts the change event when configured', async () => {
    vi.mocked(fetchMediaIndicators).mockResolvedValue({ configured: true, sessionIds: new Set([1]) });
    vi.mocked(refreshAllSessionMedia).mockResolvedValue({ configured: true, sessionIds: new Set([1, 2]) });
    const listener = vi.fn();
    window.addEventListener('mediaIndicatorsChanged', listener);

    render(wrap);
    fireEvent.click(screen.getByLabelText(en.collection.menu.openMenu));
    const item = await screen.findByText(en.session.media.refreshButtonLabel);
    fireEvent.click(item);

    await waitFor(() => expect(refreshAllSessionMedia).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(listener).toHaveBeenCalledTimes(1));
    window.removeEventListener('mediaIndicatorsChanged', listener);
  });
});
