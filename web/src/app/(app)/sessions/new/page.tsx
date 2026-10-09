'use client';

import { useNavigation } from '@/hooks/useNavigation';

import SessionForm from '@/features/sessions/form/SessionForm';
import { selectedSessionHref } from '@/features/sessions/list/useSessionSelectionNav';

export default function Page() {
  const { backOr, replace } = useNavigation();
  return (
    <SessionForm
      mode={{ kind: 'new' }}
      onDone={() => backOr('/sessions')}
      onSaved={(session) => replace(selectedSessionHref(session.id))}
    />
  );
}
