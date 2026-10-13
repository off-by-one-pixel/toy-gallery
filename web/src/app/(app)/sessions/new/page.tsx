'use client';

import { useNavigation } from '@/hooks/useNavigation';
import { routes } from '@/routes';

import SessionForm from '@/features/sessions/form/SessionForm';

export default function Page() {
  const { backOr, replace } = useNavigation();
  return (
    <SessionForm
      mode={{ kind: 'new' }}
      onDone={() => backOr(routes.sessions.list)}
      onSaved={(session) => replace(routes.sessions.selected(session.id))}
    />
  );
}
