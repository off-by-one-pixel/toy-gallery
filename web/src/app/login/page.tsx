import { Suspense } from 'react';
import Login from '@/components/Login';

export default function LoginRoute() {
  return (
    <Suspense fallback={null}>
      <Login />
    </Suspense>
  );
}
