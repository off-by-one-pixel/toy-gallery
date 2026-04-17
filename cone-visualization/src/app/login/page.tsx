import { Suspense } from 'react';
import Login from '../../components/Login';

export default function LoginRoute() {
  return (
    <div className="antialiased px-5">
      <Suspense fallback={null}>
        <Login />
      </Suspense>
    </div>
  );
}
