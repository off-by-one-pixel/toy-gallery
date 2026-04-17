import ConeList from "../components/ConeList";
import AuthGate from "../components/AuthGate";

export default function Page() {

  return (
    <AuthGate>
      <div className="antialiased px-5">
        <ConeList />
      </div>
    </AuthGate>
  );
}
