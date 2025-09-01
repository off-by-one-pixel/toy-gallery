import React from "react";
import { Render } from "./Render.js";
import { useToyStore } from "../toyMachine.js";
import EditorControls from "./EditorControls.js";

const ToyEditor = () => {
  const toy = useToyStore();

  return (
    <div className="cone-section-manager">
      <div className="flex flex-wrap items-end">
        <div className="flex-1/2">
          <Render toy={toy.getToy()} scaleFactor={1}/>
        </div>
        <div className="flex-1/2">
          <EditorControls/>
        </div>
      </div>
    </div>
  );
};

export default ToyEditor;
