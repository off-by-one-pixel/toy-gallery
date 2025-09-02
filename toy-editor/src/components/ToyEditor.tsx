import React, { RefObject, useEffect } from "react";
import { Render } from "./Render.js";
import { StyleOption, Toy, useToyStore } from "../toyMachine.js";
import EditorControls from "./EditorControls.js";

type Props = {
  width?: number;
  scaleFactor?: number;
  style: StyleOption;
  onChange?: (toy: Toy) => void;
  ref?: RefObject<null>
}

const ToyEditor: React.FC<Props> = ({ width, scaleFactor=1, style={}, onChange, ref }) => {
  const toy = useToyStore()
  
  if (width) {
    scaleFactor = width / toy.getMaxWidth();
  }

  useEffect(() => {
    if (onChange) onChange(toy.getToy())
  }, [toy]);

  return (
    <>
      <div className="flex-1/2 p-8">
        <Render toy={toy} ref={ref} scaleFactor={scaleFactor} style={{...toy.style, ...style} as StyleOption}/>
      </div>
      <div className="flex-1/2 p-8">
        <EditorControls />
      </div>
    </>
  );
};

export default ToyEditor;
