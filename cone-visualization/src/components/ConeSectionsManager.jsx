import React, { useState } from 'react';
import ConeVisualization from './ConeVisualization';

const TOP_SHAPES = {
  CONE: 'cone',
  EGG: 'egg'
};

const ConeSectionsManager = () => {
  const [sections, setSections] = useState([
    { id: 1, diameter: 100, height: 50, shape: TOP_SHAPES.CONE }
  ]);

  const addSection = () => {
    const newId = sections.length ? Math.max(...sections.map(s => s.id)) + 1 : 1;
    const lastSection = sections[sections.length - 1];
    setSections([...sections, { 
      id: newId, 
      diameter: lastSection.diameter * 0.8,
      height: 50,
      shape: TOP_SHAPES.CONE
    }]);
  };

  const removeSection = (id) => {
    setSections(sections.filter(section => section.id !== id));
  };

  const updateSection = (id, property, value) => {
    setSections(sections.map(section =>
      section.id === id ? { 
        ...section, 
        [property]: property === 'shape' ? value : Number(value) 
      } : section
    ));
  };

  const moveSection = (index, direction) => {
    const newSections = [...sections];
    const newIndex = index + direction;
    
    if (newIndex >= 0 && newIndex < sections.length) {
      [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
      setSections(newSections);
    }
  };

  const totalHeight = sections.reduce((sum, section) => sum + section.height, 0);
  const maxDiameter = Math.max(...sections.map(section => section.diameter));

  return (
    <div className="cone-sections-manager">
      <ConeVisualization sections={sections} />

      <div className="controls-container">
        <button className="add-section-button" onClick={addSection}>Add New Section</button>
        
        <div className="controls-panel">
          {sections.map((section, index) => (
            <div key={section.id} className="section-controls">
              <div className="section-header">
                <span>Section {section.id}</span>
                {index === 0 && (
                  <select
                    value={section.shape}
                    onChange={(e) => updateSection(section.id, 'shape', e.target.value)}
                    className="shape-select"
                  >
                    <option value={TOP_SHAPES.CONE}>Cone</option>
                    <option value={TOP_SHAPES.EGG}>Egg</option>
                  </select>
                )}
                <div className="order-controls">
                  <button 
                    onClick={() => moveSection(index, -1)}
                    disabled={index === 0}
                    className="order-button"
                  >
                    ↑
                  </button>
                  <button 
                    onClick={() => moveSection(index, 1)}
                    disabled={index === sections.length - 1}
                    className="order-button"
                  >
                    ↓
                  </button>
                </div>
              </div>
              <div className="section-inputs">
                <label>
                  Diameter:
                  <input
                    type="range"
                    min="10"
                    max="200"
                    value={section.diameter}
                    onChange={(e) => updateSection(section.id, 'diameter', e.target.value)}
                  />
                  <span className="value">{section.diameter}px</span>
                </label>
                <label>
                  Height:
                  <input
                    type="range"
                    min="10"
                    max="150"
                    value={section.height}
                    onChange={(e) => updateSection(section.id, 'height', e.target.value)}
                  />
                  <span className="value">{section.height}px</span>
                </label>
                <button 
                  className="remove-button" 
                  onClick={() => removeSection(section.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ConeSectionsManager;