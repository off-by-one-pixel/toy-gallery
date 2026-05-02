import AuthGate from '../../components/AuthGate';
import SessionList from '../../components/SessionList';

export default function Page() {
  return (
    <AuthGate>
      <SessionList />
    </AuthGate>
  );
}
