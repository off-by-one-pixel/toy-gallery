// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

import en from '@/i18n/catalogs/en.json';
import type { Session } from '@/api/types';
import { GirthProvider } from '@/features/preferences/GirthProvider';
import { UnitProvider } from '@/features/preferences/UnitProvider';
import { api, capture, wire } from '@/test/msw';
import { QueryWrapper } from '@/test/QueryWrapper';
import SessionForm from '@/features/sessions/form/SessionForm';

globalThis.CSS ??= { escape: (value: string) => value } as unknown as typeof CSS;

const liveSession = (startedAt: string): Session => ({
  id: 5,
  startedAt,
  isLive: true,
  entries: [],
  maxInsertableLength: null,
  maxCircumference: null,
});

const wrap = (ui: React.ReactNode) => (
  <NextIntlClientProvider locale="en" messages={en}>
    <QueryWrapper>
      <UnitProvider>
        <GirthProvider>{ui}</GirthProvider>
      </UnitProvider>
    </QueryWrapper>
  </NextIntlClientProvider>
);

describe('SessionForm live sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('saves a start-time-only change for a live session without toys', async () => {
    const detail = capture('get', api('/toys/sessions/5/'), () => wire(liveSession('2026-08-22T08:00:00Z')));
    const patch = capture('patch', api('/toys/sessions/5/'), () => wire(liveSession('2026-08-22T07:00:00Z')));
    const update = capture('put', api('/toys/sessions/5/'));
    render(wrap(<SessionForm mode={{ kind: 'edit', sessionId: 5 }} />));

    const save = await screen.findByRole('button', { name: en.session.live.updateButton });
    expect(screen.getByText(en.session.live.badge)).toBeTruthy();
    expect(screen.queryByRole('button', { name: en.session.live.endAndSaveButton })).toBeNull();
    await waitFor(() => expect(detail.urls.length).toBeGreaterThan(0));
    expect(save.hasAttribute('disabled')).toBe(true);

    const startInput = document.querySelector('input[type="datetime-local"]');
    expect(startInput).not.toBeNull();
    fireEvent.change(startInput as Element, { target: { value: '2026-08-22T07:00' } });
    await waitFor(() => expect(save.hasAttribute('disabled')).toBe(false));
    fireEvent.click(save);

    await waitFor(() => expect(patch.urls).toHaveLength(1));
    expect(patch.bodies[0]).toHaveProperty('started_at');
    expect(Object.keys(patch.bodies[0] as object)).toEqual(['started_at']);
    expect(update.urls).toHaveLength(0);
    await waitFor(() => expect(push).toHaveBeenCalledWith('/sessions'));
  });

  it('keeps save disabled for a finished session without toys', async () => {
    const detail = capture('get', api('/toys/sessions/5/'), () =>
      wire({ ...liveSession('2026-08-22T08:00:00Z'), isLive: false }),
    );
    const patch = capture('patch', api('/toys/sessions/5/'));
    const update = capture('put', api('/toys/sessions/5/'));
    render(wrap(<SessionForm mode={{ kind: 'edit', sessionId: 5 }} />));

    const save = await screen.findByRole('button', { name: en.session.save });
    await waitFor(() => expect(detail.urls.length).toBeGreaterThan(0));
    expect(save.hasAttribute('disabled')).toBe(true);
    fireEvent.click(save);
    expect(patch.urls).toHaveLength(0);
    expect(update.urls).toHaveLength(0);
  });
});
