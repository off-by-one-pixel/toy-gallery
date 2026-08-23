// @vitest-environment jsdom

import type { QueryClient } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

globalThis.CSS ??= { escape: (value: string) => value } as unknown as typeof CSS;

import en from '@/i18n/catalogs/en.json';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { api, capture } from '@/test/msw';
import { createTestQueryClient, QueryWrapper } from '@/test/QueryWrapper';
import AppMenu from '@/components/AppMenu';

const wrap = (client?: QueryClient) => (
  <NextIntlClientProvider locale="en" messages={en}>
    <QueryWrapper client={client}>
      <AuthProvider>
        <AppMenu />
      </AuthProvider>
    </QueryWrapper>
  </NextIntlClientProvider>
);

describe('AppMenu', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('omits the refresh-media item when media is not configured', async () => {
    const status = capture('get', api('/toys/sessions/media-status/'), () => ({ configured: false }));
    render(wrap());
    await waitFor(() => expect(status.urls.length).toBeGreaterThan(0));
    fireEvent.click(screen.getByLabelText(en.collection.menu.openMenu));
    await screen.findByText(en.collection.menu.settingsLabel);
    expect(screen.queryByText(en.session.media.refreshButtonLabel)).toBeNull();
  });

  it('refreshes media and invalidates the media queries when configured', async () => {
    capture('get', api('/toys/sessions/media-status/'), () => ({ configured: true }));
    const refresh = capture('post', api('/toys/sessions/refresh-media/'), () => ({
      configured: true,
      sessions_with_media: 2,
    }));
    const client = createTestQueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    render(wrap(client));
    fireEvent.click(screen.getByLabelText(en.collection.menu.openMenu));
    const item = await screen.findByText(en.session.media.refreshButtonLabel);
    fireEvent.click(item);

    await waitFor(() => expect(refresh.urls).toHaveLength(1));
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['media'] }));
  });
});
