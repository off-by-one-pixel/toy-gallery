import { Suspense } from 'react';

import SessionEditClient from './SessionEditClient';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SessionEditClient />
    </Suspense>
  );
}
