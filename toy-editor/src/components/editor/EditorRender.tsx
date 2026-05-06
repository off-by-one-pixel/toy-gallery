import { useImperativeHandle } from "react";
import type { RefObject } from "react";
import type { StyleOption, Toy } from "../../toyMachine";
import Silhouette from "../Silhouette";
import SvgRoot from "../SvgRoot";
import DragLayer from "./DragLayer";
import Guides from "./Guides";
import RimPresetButtons from "./RimPresetButtons";
import { EditorLayoutProvider } from "./EditorLayoutContext";
import { useEditorUiStore } from "./editorUiStore";
import Ruler from "./Ruler";
import SectionLabels from "./SectionLabels";
import TotalReadout from "./TotalReadout";
import { useDragHandlers } from "./hooks/useDragHandlers";
import { useEditorLayout } from "./hooks/useEditorLayout";

type Props = {
  toy: Toy;
  style: StyleOption;
  ref?: RefObject<SVGSVGElement | null>;
  onSelect?: (id: number) => void;
};

const EditorRender = ({ toy, style, ref, onSelect }: Props) => {
  const layout = useEditorLayout(toy);
  const handlers = useDragHandlers(layout);
  const setHoveredSectionId = useEditorUiStore((s) => s.setHoveredSectionId);
  useImperativeHandle(ref, () => layout.ref.current as SVGSVGElement, [layout.ref]);

  return (
    <SvgRoot
      ref={layout.ref}
      viewBox={`0 0 ${layout.size.w || 1} ${layout.size.h || 1}`}
      preserveAspectRatio="none"
    >
      {layout.ready && (
        <EditorLayoutProvider value={layout}>
          <Guides />

          <g transform={`translate(${layout.silhouetteX}, ${layout.silhouetteY})`}>
            <Silhouette
              sections={toy.sections}
              topShape={toy.topShape}
              bottomShape={toy.bottomShape}
              scaleFactor={layout.silhouetteScale}
              maxDiameter={layout.silhouetteW}
              style={style}
              onSelect={onSelect}
              onHover={setHoveredSectionId}
              interactive
            />
          </g>

          <Ruler />
          <TotalReadout />

          <g className="cone-editor-chrome">
            <SectionLabels />
            <DragLayer handlers={handlers} />
            <RimPresetButtons />
          </g>
        </EditorLayoutProvider>
      )}
    </SvgRoot>
  );
};

export default EditorRender;
