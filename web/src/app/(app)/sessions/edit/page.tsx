import { Suspense } from 'react';

import SessionEditClient from '@/app/(app)/sessions/edit/SessionEditClient';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SessionEditClient />
    </Suspense>
  );
}
