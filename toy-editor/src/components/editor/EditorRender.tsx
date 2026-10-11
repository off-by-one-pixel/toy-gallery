import { useRef, type Dispatch, type SetStateAction } from "react";
import type { StyleOption, Toy } from "../../toyMachine";
import Silhouette from "../Silhouette";
import SvgRoot from "../SvgRoot";
import DragLayer from "./DragLayer";
import Guides from "./Guides";
import CurveAngleButtons from "./CurveAngleButtons";
import { EditorLayoutProvider } from "./EditorLayoutContext";
import { useEditorUiStore } from "./editorUiStore";
import Ruler from "./Ruler";
import SectionColorControls from "./SectionColorControls";
import SectionLabels from "./SectionLabels";
import TotalReadout from "./TotalReadout";
import { useDragHandlers } from "./hooks/useDragHandlers";
import { useEditorLayout } from "./hooks/useEditorLayout";
import { useReferenceImageDrag } from "./hooks/useReferenceImageDrag";
import type { ReferenceImage } from "./referenceImage";
import { ReferenceImageBackdrop, ReferenceImageResizeHandle } from "./ReferenceImageLayer";

type Props = {
  toy: Toy;
  style: StyleOption;
  referenceImage: ReferenceImage | null;
  onReferenceImageChange: Dispatch<SetStateAction<ReferenceImage | null>>;
};

const EditorRender = ({ toy, style, referenceImage, onReferenceImageChange }: Props) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const layout = useEditorLayout(svgRef, toy, referenceImage);
  const handlers = useDragHandlers(layout);
  const imageHandlers = useReferenceImageDrag(layout, referenceImage, onReferenceImageChange);
  const setHoveredSectionId = useEditorUiStore((s) => s.setHoveredSectionId);

  return (
    <SvgRoot
      ref={svgRef}
      viewBox={`0 0 ${layout.size.w || 1} ${layout.size.h || 1}`}
      preserveAspectRatio="none"
    >
      {layout.ready && (
        <EditorLayoutProvider value={layout}>
          {referenceImage && (
            <ReferenceImageBackdrop image={referenceImage} handlers={imageHandlers} />
          )}
          <Guides />

          <g
            className={referenceImage ? "toy-editor-see-through" : undefined}
            transform={`translate(${layout.silhouetteX}, ${layout.silhouetteY})`}
          >
            <Silhouette
              sections={toy.sections}
              topShape={toy.topShape}
              bottomShape={toy.bottomShape}
              scaleFactor={layout.silhouetteScale}
              maxDiameter={layout.silhouetteW}
              style={style}
              onHover={setHoveredSectionId}
              interactive
            />
          </g>

          <Ruler />
          <TotalReadout />

          <g className="toy-editor-chrome">
            {referenceImage && (
              <ReferenceImageResizeHandle image={referenceImage} handlers={imageHandlers} />
            )}
            <SectionLabels />
            <DragLayer handlers={handlers} />
            <CurveAngleButtons />
            <SectionColorControls />
          </g>
        </EditorLayoutProvider>
      )}
    </SvgRoot>
  );
};

export default EditorRender;
