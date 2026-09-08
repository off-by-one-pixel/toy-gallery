// @vitest-environment happy-dom

import { fireEvent, render, screen } from '@testing-library/react';
import { settle } from '@/test/wait';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useNavigation', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/hooks/useNavigation')>();
  const { testNavigation } = await import('@/test/navigation');
  return { ...original, useNavigation: () => testNavigation() };
});

const sessionsState = vi.hoisted(() => ({
  current: {
    session: null as unknown,
    isSessionLoading: false,
    sessionError: null as string | null,
    saveSession: vi.fn(),
    isSavingSession: false,
  },
}));

vi.mock('@/features/sessions/useSessions', () => ({
  useSessions: () => sessionsState.current,
}));

const toysState = vi.hoisted(() => ({ current: [] as unknown[] }));

vi.mock('@/features/toys/useToys', () => ({
  useToys: () => ({ toys: toysState.current, isLoading: false, error: null }),
}));

import en from '@/i18n/catalogs/en.json';
import { resetNavigation } from '@/test/navigation';
import { makeSession, makeToy } from '@/test/fixtures';
import { withAppProviders } from '@/test/render';
import SessionForm from '@/features/sessions/form/SessionForm';

globalThis.CSS ??= { escape: (value: string) => value } as unknown as typeof CSS;

const liveSession = (startedAt: string) => makeSession({ id: 5, startedAt, isLive: true });

const onDone = vi.fn();

describe('SessionForm live sessions', () => {
  beforeEach(() => {
    onDone.mockClear();
    vi.clearAllMocks();
    resetNavigation();
    localStorage.clear();
    sessionsState.current.session = null;
    sessionsState.current.isSavingSession = false;
    toysState.current = [];
  });

  it('saves a start-time-only change for a live session without toys', async () => {
    sessionsState.current.session = liveSession('2026-08-22T08:00:00Z');
    sessionsState.current.saveSession.mockResolvedValue(liveSession('2026-08-22T07:00:00Z'));
    render(withAppProviders(<SessionForm mode={{ kind: 'edit', sessionId: 5 }} onDone={onDone} />));

    const save = await screen.findByRole('button', { name: en.session.live.updateButton });
    expect(screen.getByText(en.session.live.badge)).toBeTruthy();
    expect(screen.queryByRole('button', { name: en.session.live.endAndSaveButton })).toBeNull();
    expect(save.hasAttribute('disabled')).toBe(true);

    const startInput = document.querySelector('input[type="datetime-local"]');
    expect(startInput).not.toBeNull();
    fireEvent.change(startInput as Element, { target: { value: '2026-08-22T07:00' } });
    await settle(() => expect(save.hasAttribute('disabled')).toBe(false));
    fireEvent.click(save);

    await settle(() => expect(sessionsState.current.saveSession).toHaveBeenCalledTimes(1));
    expect(sessionsState.current.saveSession).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 5,
        liveStartOnly: true,
        payload: expect.objectContaining({ entries: [] }),
      }),
    );
    await settle(() => expect(onDone).toHaveBeenCalled());
  });

  it('keeps save disabled for a finished session without toys', async () => {
    sessionsState.current.session = { ...liveSession('2026-08-22T08:00:00Z'), isLive: false };
    render(withAppProviders(<SessionForm mode={{ kind: 'edit', sessionId: 5 }} onDone={onDone} />));

    const save = await screen.findByRole('button', { name: en.session.save });
    expect(save.hasAttribute('disabled')).toBe(true);
    fireEvent.click(save);
    expect(sessionsState.current.saveSession).not.toHaveBeenCalled();
  });
});

describe('SessionForm toy ordering', () => {
  beforeEach(() => {
    onDone.mockClear();
    vi.clearAllMocks();
    resetNavigation();
    localStorage.clear();
    sessionsState.current.session = null;
    toysState.current = [
      makeToy({ id: 1, name: 'Alpha' }),
      makeToy({ id: 2, name: 'Beta' }),
      makeToy({ id: 3, name: 'Gamma' }),
    ];
  });

  const renderedToyNames = () => screen.getAllByText(/^(Alpha|Beta|Gamma)$/).map((el) => el.textContent);

  it('pins the session toys to the top and keeps order stable while selecting', async () => {
    sessionsState.current.session = makeSession({
      id: 5,
      startedAt: '2026-06-01T20:00:00',
      entries: [{ toy: 3, involvement: 'FULLY_INSERTED', durationMinutes: null }],
    } as never);
    render(withAppProviders(<SessionForm mode={{ kind: 'edit', sessionId: 5 }} onDone={onDone} />));

    await settle(() => expect(renderedToyNames()).toEqual(['Gamma', 'Alpha', 'Beta']));

    fireEvent.click(screen.getAllByRole('button', { name: en.involvement.USED })[1]);
    await settle(() => expect(renderedToyNames()).toEqual(['Gamma', 'Alpha', 'Beta']));
  });

  it('keeps the plain sort order for new sessions', async () => {
    render(withAppProviders(<SessionForm mode={{ kind: 'new' }} onDone={onDone} />));
    await settle(() => expect(renderedToyNames()).toEqual(['Alpha', 'Beta', 'Gamma']));
  });
});
