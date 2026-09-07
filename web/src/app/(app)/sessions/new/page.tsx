'use client';

import { useNavigation } from '@/hooks/useNavigation';

import SessionForm from '@/features/sessions/form/SessionForm';

export default function Page() {
  const { backOr } = useNavigation();
  return <SessionForm mode={{ kind: 'new' }} onDone={() => backOr('/sessions')} />;
}
