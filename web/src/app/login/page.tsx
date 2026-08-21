import { Suspense } from 'react';
import Login from '@/features/auth/Login';

export default function LoginRoute() {
  return (
    <Suspense fallback={null}>
      <Login />
    </Suspense>
  );
}
