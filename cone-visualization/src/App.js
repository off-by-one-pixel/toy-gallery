import React from 'react';
import ConeSectionsManager from './components/ConeSectionsManager';
import './styles/ConeSectionsManager.css';
import ConeList from './components/ConeList';

function App() {
  return (
    <div className="App">
      <h1>Cone Section Visualization</h1>
      <ConeSectionsManager />
      <ConeList />
    </div>
  );
}

export default App;