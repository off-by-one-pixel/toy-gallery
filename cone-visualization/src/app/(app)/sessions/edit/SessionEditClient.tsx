'use client';

import { useSearchParams } from 'next/navigation';

import SessionForm from '../../../../components/SessionForm';

export default function SessionEditClient() {
  const params = useSearchParams();
  const idParam = params.get('id');
  const id = idParam ? Number(idParam) : Number.NaN;
  if (!Number.isFinite(id)) {
    return (
      <main className="mx-auto max-w-300 px-6 py-12 text-center text-sm text-neutral-500">Invalid session id.</main>
    );
  }
  return <SessionForm mode={{ kind: 'edit', sessionId: id }} />;
}
