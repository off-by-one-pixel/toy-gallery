import ConeList from "../components/ConeList";

export default async function Page() {
 
  const coneMeasurements = [
    { diameter: 100, height: 50 },  // Top section
    { diameter: 150, height: 75 },  // Middle section
    { diameter: 200, height: 100 }, // Bottom section
  ];

  return (
    <div className="App antialiased px-5 bg-gray-200">
      <ConeList />
    </div>
  );
}