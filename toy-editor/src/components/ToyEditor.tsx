import React from 'react';
import { Render } from './Render.js';
import { useToyStore } from '../toyMachine.js';
import EditorControls from './EditorControls.js';

const ToyEditor = () => {
  const sections = useToyStore((s) => s.sections);

  return (
    <div className="cone-section-manager">
      <div className="flex flex-wrap items-end">
        <div className="flex-1/2">
          <Render/>
        </div>
        <div className="flex-1/2">
          <EditorControls sections={sections}/>
        </div>
      </div>
    </div>
  );
};

export default ToyEditor;