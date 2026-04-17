import type { RefObject } from "react";
import { useEffect } from "react";
import type { StyleOption, Toy } from "../toyMachine";
import { useToyStore } from "../toyMachine";
import EditorControls from "./EditorControls";
import { Render } from "./Render";

type Props = {
  width?: number;
  scaleFactor?: number;
  style?: Partial<StyleOption>;
  onChange?: (toy: Toy) => void;
  ref?: RefObject<SVGSVGElement | null>;
};

const ToyEditor = ({ width, scaleFactor = 1, style = {}, onChange, ref }: Props) => {
  const toy = useToyStore();
  const effectiveScale = width ? width / toy.getMaxWidth() : scaleFactor;
  const mergedStyle = { ...toy.style, ...style } as StyleOption;

  useEffect(() => {
    onChange?.(toy.getToy());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toy.sections, toy.topShape, toy.bottomShape]);

  return (
    <div className="cone-editor-root">
      <div className="cone-editor-canvas">
        <Render toy={toy} ref={ref} scaleFactor={effectiveScale} style={mergedStyle} />
      </div>
      <div className="cone-editor-controls">
        <EditorControls />
      </div>
    </div>
  );
};

export default ToyEditor;
