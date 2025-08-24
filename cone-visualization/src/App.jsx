import React from 'react';
import ConeVisualization from './components/ConeVisualization';

function App() {
  const coneMeasurements = [
    { diameter: 100, height: 50 },  // Top section
    { diameter: 150, height: 75 },  // Middle section
    { diameter: 200, height: 100 }, // Bottom section
  ];

  return (
    <div>
      <ConeVisualization measurements={coneMeasurements} />
    </div>
  );
}

export default App;