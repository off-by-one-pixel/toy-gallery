import { Suspense } from 'react';

import AuthGate from '../../../components/AuthGate';
import SessionEditClient from './SessionEditClient';

export default function Page() {
  return (
    <AuthGate>
      <Suspense fallback={null}>
        <SessionEditClient />
      </Suspense>
    </AuthGate>
  );
}
