import type { ReactNode, RefObject } from "react";
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
  /**
   * Optional seed state. When the identity of this object changes (e.g. the
   * caller opens the editor for a different toy), the store is reset to
   * match. Pass a stable reference to avoid clobbering user edits.
   */
  initialToy?: Toy;
  /** Rendered at the top of the controls column, above the built-in groups. */
  leadingSlot?: ReactNode;
};

const ToyEditor = ({
  width,
  scaleFactor = 1,
  style = {},
  onChange,
  ref,
  initialToy,
  leadingSlot,
}: Props) => {
  const toy = useToyStore();
  const hydrate = useToyStore((s) => s.hydrate);
  const effectiveScale = width ? width / toy.getMaxWidth() : scaleFactor;
  const mergedStyle = { ...toy.style, ...style } as StyleOption;
  const fixed = width !== undefined;

  useEffect(() => {
    if (initialToy) hydrate(initialToy);
  }, [initialToy, hydrate]);

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
        {leadingSlot}
        <EditorControls />
      </aside>
    </div>
  );
};

export default ToyEditor;
