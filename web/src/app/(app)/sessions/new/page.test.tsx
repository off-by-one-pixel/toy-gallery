// @vitest-environment happy-dom

import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useNavigation', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/hooks/useNavigation')>();
  const { testNavigation } = await import('@/test/navigation');
  return { ...original, useNavigation: () => testNavigation() };
});

const formProps = vi.hoisted(() => ({
  current: null as null | { onDone: () => void; onSaved: (session: { id: number }) => void },
}));

vi.mock('@/features/sessions/form/SessionForm', () => ({
  default: (props: typeof formProps.current) => {
    formProps.current = props;
    return null;
  },
}));

import { backOrMock, replaceMock, resetNavigation } from '@/test/navigation';
import { makeSession } from '@/test/fixtures';
import { selectedSessionHref } from '@/features/sessions/list/useSessionSelectionNav';
import Page from '@/app/(app)/sessions/new/page';

describe('new session page', () => {
  beforeEach(() => {
    resetNavigation();
    formProps.current = null;
    render(<Page />);
  });

  it('replaces the form with the sessions list selecting the saved session', () => {
    formProps.current?.onSaved(makeSession({ id: 7 }));
    expect(replaceMock).toHaveBeenCalledWith(selectedSessionHref(7));
    expect(backOrMock).not.toHaveBeenCalled();
  });

  it('goes back when leaving without saving', () => {
    formProps.current?.onDone();
    expect(backOrMock).toHaveBeenCalledWith('/sessions');
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
