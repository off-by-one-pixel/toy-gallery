'use client';

import { useNavigation } from '@/hooks/useNavigation';

import SessionForm from '@/features/sessions/form/SessionForm';

export default function SessionEditClient() {
  const { param, backOr } = useNavigation();
  const idParam = param('id');
  const id = idParam ? Number(idParam) : Number.NaN;
  if (!Number.isFinite(id)) {
    return <main className="mx-auto max-w-300 px-6 py-12 text-center text-sm text-muted">Invalid session id.</main>;
  }
  return <SessionForm mode={{ kind: 'edit', sessionId: id }} onDone={() => backOr('/sessions')} />;
}
