import AuthGate from '../../../components/AuthGate';
import SessionForm from '../../../components/SessionForm';

export default function Page() {
  return (
    <AuthGate>
      <SessionForm mode={{ kind: 'new' }} />
    </AuthGate>
  );
}
