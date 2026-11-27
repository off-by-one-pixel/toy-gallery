import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Session } from '@/api/types';
import type { LiveState } from '@/features/sessions/form/sessionDraft';

vi.mock('@/hooks/useNavigation', async () => (await import('@/test/navigation')).navigationModule());

const formProps = vi.hoisted(() => ({
  current: null as null | { onDone: () => void; onSaved: (saved: Session, live: LiveState | null) => void },
}));

vi.mock('@/features/sessions/form/SessionForm', () => ({
  default: (props: typeof formProps.current) => {
    formProps.current = props;
    return null;
  },
}));

import { backOrMock, navState, replaceMock, resetNavigation } from '@/test/navigation';
import { makeSession } from '@/test/fixtures';
import { withAppProviders } from '@/test/render';
import { routes } from '@/routes';
import SessionEditClient from '@/app/(app)/sessions/edit/SessionEditClient';

const saved = makeSession({ id: 5 });

describe('edit session page', () => {
  beforeEach(() => {
    resetNavigation();
    navState.search = 'id=5';
    formProps.current = null;
    render(withAppProviders(<SessionEditClient />));
  });

  it('replaces the form with the sessions list selecting a live session that was just ended', () => {
    formProps.current?.onSaved(saved, 'ending');
    expect(replaceMock).toHaveBeenCalledWith(routes.sessions.selected(5));
    expect(backOrMock).not.toHaveBeenCalled();
  });

  it('goes back after updating a session that stays live', () => {
    formProps.current?.onSaved(saved, 'open');
    expect(backOrMock).toHaveBeenCalledWith(routes.sessions.list);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('goes back after saving a finished session', () => {
    formProps.current?.onSaved(saved, null);
    expect(backOrMock).toHaveBeenCalledWith(routes.sessions.list);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('goes back when leaving without saving', () => {
    formProps.current?.onDone();
    expect(backOrMock).toHaveBeenCalledWith(routes.sessions.list);
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
