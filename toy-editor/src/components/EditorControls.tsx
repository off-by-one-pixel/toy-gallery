import React from 'react';

import { Button, Slider, IconButton } from "@material-tailwind/react";
import { useToyStore } from "../toyMachine.js";


type Props = {
  sections: ReturnType<typeof useToyStore.getState>["sections"];
};


const EditorControls: React.FC<Props> = ({ sections }) => {
  const addSection = useToyStore((s) => s.newSection);
  const removeSection = useToyStore((s) => s.removeSection);

  const MIN_DIAMETER = 10;
  const MAX_DIAMETER = 200;
  const MIN_HEIGHT = 1;
  const MAX_HEIGHT = 350;

  return (
    <div className="flex-1/2">
      <div>
        {sections.map((sectionStore, index) => {
          const { id, diameter, height, shape } = sectionStore();
          const setDiameter = sectionStore((s) => s.setDiameter);
          const setHeight = sectionStore((s) => s.setHeight);
          return (
            <div key={id} className="flex border p-2 m-2 rounded-2xl">
              <div>
                {index === 0 && (
                  <select
                    value={shape}
                    onChange={(e) => { }}
                  >
                    <option value='CONE'>Cone</option>
                    <option value='EGG'>Egg</option>
                  </select>
                )}
                <div className="flex flex-wrap gap-1 p-1">
                  <IconButton size="sm" className="w-full text-xs" color="white" variant="gradient" onClick={() => { }}>
                    ↑
                  </IconButton>
                  <IconButton size="sm" className="w-full text-xs" color="white" variant="gradient" onClick={() => { }}>
                    ↓
                  </IconButton>
                  <IconButton size="sm" className="text-xs" color="red" onClick={() => removeSection(id)}
                  >
                    X
                  </IconButton>
                </div>
              </div>
              <div className="flex flex-col flex-1 p-4">
                <label className="flex-1">
                  Diameter: <span className="value">{Math.round(diameter)} mm</span>
                  <Slider size="sm" value={(diameter - MIN_DIAMETER) / ((MAX_DIAMETER - MIN_DIAMETER) / 100)} onChange={(e) => setDiameter((MAX_DIAMETER - MIN_DIAMETER) / 100 * (e.target.value) + MIN_DIAMETER)} />
                </label>
                <label>
                  Height: <span className="value">{Math.round(height)} mm</span>
                  <Slider
                    size="sm"
                    value={(height - MIN_HEIGHT) / ((MAX_HEIGHT - MIN_HEIGHT) / 100)}
                    onChange={(e) => setHeight((MAX_HEIGHT - MIN_HEIGHT) / 100 * (e.target.value) + MIN_HEIGHT)}
                  />
                </label>
              </div>
            </div>
          )
        })}
      </div>
      <Button id="saf" onClick={addSection}>Add New Section</Button>
    </div>
  );
};

export default EditorControls;