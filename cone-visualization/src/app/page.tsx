import ConeList from "../components/ConeList";
import AuthGate from "../components/AuthGate";

export default function Page() {

  return (
    <AuthGate>
      <ConeList />
    </AuthGate>
  );
}
