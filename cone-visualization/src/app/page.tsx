import ConeList from "../components/ConeList";
import ConeSectionsManager from "../components/ConeSectionsManager";

export default async function Page() {
 
  const coneMeasurements = [
    { diameter: 100, height: 50 },  // Top section
    { diameter: 150, height: 75 },  // Middle section
    { diameter: 200, height: 100 }, // Bottom section
  ];

  return (
    <div className="App">
      <h1>Cone Section Visualization</h1>
      <ConeSectionsManager />
      <ConeList />
    </div>
  );
}