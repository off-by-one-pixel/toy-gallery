import { useImperativeHandle } from "react";
import type { RefObject } from "react";
import type { StyleOption, Toy } from "../../toyMachine";
import Silhouette from "../Silhouette";
import SvgRoot from "../SvgRoot";
import DragLayer from "./DragLayer";
import Guides from "./Guides";
import {
  DIAMETER_LABEL_GAP_PX,
  HEIGHT_LABEL_GAP_PX,
  LABEL_INPUT_W_PX,
  RULER_AXIS_X_PX,
  RULER_WIDTH_PX,
} from "./layout";
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

/** Renders the toy editor — the silhouette plus all interactive chrome
 *  (ruler, reference guides, per-section editable labels, drag handles,
 *  remove buttons, total readout).
 *
 *  Layout and drag behaviour are owned by the corresponding hooks;
 *  this component is a thin composition layer that wires them together.
 *  The viewBox is sized to the SVG's actual pixel dimensions
 *  (1 viewBox unit == 1 CSS pixel) so chrome elements use fixed pixel
 *  sizes that don't scale as the toy grows. */
const EditorRender = ({ toy, style, ref, onSelect }: Props) => {
  const layout = useEditorLayout(toy);
  const handlers = useDragHandlers(layout);
  useImperativeHandle(ref, () => layout.ref.current as SVGSVGElement, [layout.ref]);

  const {
    size,
    silhouetteScale,
    silhouetteX,
    silhouetteY,
    silhouetteW,
    silhouetteH,
    silhouetteCenter,
    sectionMeta,
    totalHeightMm,
    maxDiameterMm,
    ready,
  } = layout;

  const heightLabelX = Math.max(
    4,
    silhouetteX - HEIGHT_LABEL_GAP_PX - LABEL_INPUT_W_PX,
  );
  const diameterLabelX = silhouetteX + silhouetteW + DIAMETER_LABEL_GAP_PX;

  return (
    <SvgRoot
      ref={layout.ref}
      viewBox={`0 0 ${size.w || 1} ${size.h || 1}`}
      preserveAspectRatio="none"
    >
      {ready && (
        <>
          <Guides
            insertableMm={toy.insertableLengthMm ?? null}
            knownTotalMm={toy.knownTotalMm ?? null}
            knownSizeMm={toy.knownSizeMm ?? null}
            silhouetteScale={silhouetteScale}
            silhouetteY={silhouetteY}
            silhouetteH={silhouetteH}
            silhouetteCenter={silhouetteCenter}
            xLeft={Math.max(8, RULER_WIDTH_PX - 60)}
            xRight={size.w - 8}
          />

          <g transform={`translate(${silhouetteX}, ${silhouetteY})`}>
            <Silhouette
              sections={toy.sections}
              topShape={toy.topShape}
              bottomShape={toy.bottomShape}
              scaleFactor={silhouetteScale}
              maxDiameter={silhouetteW}
              style={style}
              onSelect={onSelect}
              interactive
            />
          </g>

          {/* Always-visible chrome: ruler axis + total readout */}
          <Ruler
            sections={sectionMeta}
            silhouetteScale={silhouetteScale}
            silhouetteY={silhouetteY}
            silhouetteH={silhouetteH}
            rulerAxisX={RULER_AXIS_X_PX}
          />
          <TotalReadout
            x={silhouetteCenter}
            y={silhouetteY + silhouetteH + 18}
            totalHeightMm={totalHeightMm}
            maxDiameterMm={maxDiameterMm}
          />

          {/* Hover-hidden chrome: per-section inputs + drag affordances */}
          <g className="cone-editor-chrome">
            <SectionLabels
              sections={sectionMeta}
              silhouetteScale={silhouetteScale}
              silhouetteCenter={silhouetteCenter}
              silhouetteY={silhouetteY}
              heightLabelX={heightLabelX}
              diameterLabelX={diameterLabelX}
              knownSizeMm={toy.knownSizeMm ?? null}
            />
            <DragLayer
              sections={sectionMeta}
              silhouetteScale={silhouetteScale}
              silhouetteCenter={silhouetteCenter}
              silhouetteX={silhouetteX}
              silhouetteY={silhouetteY}
              silhouetteW={silhouetteW}
              bottomShape={toy.bottomShape}
              diameterLabelX={diameterLabelX}
              handlers={handlers}
            />
          </g>
        </>
      )}
    </SvgRoot>
  );
};

export default EditorRender;
