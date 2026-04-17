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
  const fixed = width !== undefined;

  useEffect(() => {
    onChange?.(toy.getToy());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toy.sections, toy.topShape, toy.bottomShape]);

  return (
    <div className="cone-editor-root">
      <section className="cone-editor-canvas">
        <div className="cone-editor-hint" aria-hidden>
          Click a section to select
        </div>
        <div className="cone-editor-stage">
          <Render
            toy={toy}
            ref={ref}
            scaleFactor={effectiveScale}
            style={mergedStyle}
            selectedId={toy.selectedId}
            onSelect={toy.setSelected}
            fixed={fixed}
          />
        </div>
      </section>
      <aside className="cone-editor-controls">
        <EditorControls />
      </aside>
    </div>
  );
};

export default ToyEditor;
