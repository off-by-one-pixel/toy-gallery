import React, { use } from "react";

import { Button, Slider, IconButton } from "@material-tailwind/react";
import { useToyStore } from "../toyMachine.js";


const EditorControls: React.FC = () => {
  const toy = useToyStore();

  const MIN_DIAMETER = 10;
  const MAX_DIAMETER = 200;
  const MIN_HEIGHT = 1;
  const MAX_HEIGHT = 350;

  return (
    <div className="flex-1/2">
      <div>
        {toy.sections.map((section, index) => {
          return (
            <div key={section.id} className="flex border p-2 m-2 rounded-2xl">
              <div>
                {index === 0 && (
                  <select value={toy.topShape} onChange={(e) => {}}>
                    <option value="CONE">Cone</option>
                    <option value="EGG">Egg</option>
                  </select>
                )}
                <div className="flex flex-wrap gap-1 p-1">
                  <IconButton
                    size="sm"
                    className="w-full text-xs"
                    color="white"
                    variant="gradient"
                    onClick={() => {toy.moveSection(section.id, -1)}}
                  >
                    ↑
                  </IconButton>
                  <IconButton
                    size="sm"
                    className="w-full text-xs"
                    color="white"
                    variant="gradient"
                    onClick={() => {toy.moveSection(section.id, 1)}}
                  >
                    ↓
                  </IconButton>
                  <IconButton
                    size="sm"
                    className="text-xs"
                    color="red"
                    onClick={() => toy.removeSection(section.id)}
                  >
                    X
                  </IconButton>
                </div>
              </div>
              <div className="flex flex-col flex-1 p-4">
                <label className="flex-1">
                  Diameter:{" "}
                  <span className="value">{Math.round(section.diameter)} mm</span>
                  <Slider
                    size="sm"
                    value={
                      (section.diameter - MIN_DIAMETER) /
                      ((MAX_DIAMETER - MIN_DIAMETER) / 100)
                    }
                    onChange={(e) =>
                      toy.setDiameter(section.id,
                        ((MAX_DIAMETER - MIN_DIAMETER) / 100) * e.target.value +
                          MIN_DIAMETER,
                      )
                    }
                  />
                </label>
                <label>
                  Height: <span className="value">{Math.round(section.height)} mm</span>
                  <Slider
                    size="sm"
                    value={
                      (section.height - MIN_HEIGHT) / ((MAX_HEIGHT - MIN_HEIGHT) / 100)
                    }
                    onChange={(e) =>
                      toy.setHeight(section.id,
                        ((MAX_HEIGHT - MIN_HEIGHT) / 100) * e.target.value +
                          MIN_HEIGHT,
                      )
                    }
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>
      <Button id="saf" onClick={() => toy.newSection()} fullWidth>
        Add New Section
      </Button>
    </div>  
  );
};

export default EditorControls;
