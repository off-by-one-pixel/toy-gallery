// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api', () => ({
  createSession: vi.fn(),
  fetchSession: vi.fn(),
  fetchToys: vi.fn(),
  patchSessionStart: vi.fn(),
  updateSession: vi.fn(),
}));

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

import en from '@/i18n/catalogs/en.json';
import { fetchSession, fetchToys, patchSessionStart, updateSession } from '@/api';
import type { Session } from '@/api/types';
import { GirthProvider } from '@/features/preferences/GirthProvider';
import { UnitProvider } from '@/features/preferences/UnitProvider';
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
    vi.mocked(fetchToys).mockResolvedValue([]);
  });

  it('saves a start-time-only change for a live session without toys', async () => {
    vi.mocked(fetchSession).mockResolvedValue(liveSession('2026-08-22T08:00:00Z'));
    vi.mocked(patchSessionStart).mockResolvedValue(liveSession('2026-08-22T07:00:00Z'));
    render(wrap(<SessionForm mode={{ kind: 'edit', sessionId: 5 }} />));

    const save = await screen.findByRole('button', { name: en.session.live.updateButton });
    expect(screen.getByText(en.session.live.badge)).toBeTruthy();
    expect(screen.queryByRole('button', { name: en.session.live.endAndSaveButton })).toBeNull();
    await waitFor(() => expect(fetchSession).toHaveBeenCalled());
    expect(save.hasAttribute('disabled')).toBe(true);

    const startInput = document.querySelector('input[type="datetime-local"]');
    expect(startInput).not.toBeNull();
    fireEvent.change(startInput as Element, { target: { value: '2026-08-22T07:00' } });
    await waitFor(() => expect(save.hasAttribute('disabled')).toBe(false));
    fireEvent.click(save);

    await waitFor(() => expect(patchSessionStart).toHaveBeenCalledTimes(1));
    expect(vi.mocked(patchSessionStart).mock.calls[0][0]).toBe(5);
    expect(updateSession).not.toHaveBeenCalled();
    await waitFor(() => expect(push).toHaveBeenCalledWith('/sessions'));
  });

  it('keeps save disabled for a finished session without toys', async () => {
    vi.mocked(fetchSession).mockResolvedValue({ ...liveSession('2026-08-22T08:00:00Z'), isLive: false });
    render(wrap(<SessionForm mode={{ kind: 'edit', sessionId: 5 }} />));

    const save = await screen.findByRole('button', { name: en.session.save });
    await waitFor(() => expect(fetchSession).toHaveBeenCalled());
    expect(save.hasAttribute('disabled')).toBe(true);
    fireEvent.click(save);
    expect(patchSessionStart).not.toHaveBeenCalled();
    expect(updateSession).not.toHaveBeenCalled();
  });
});
