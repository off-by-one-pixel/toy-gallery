import { Shape, useToyStore } from "../../toyMachine";
import type { DragHandlers } from "./hooks/useDragHandlers";
import {
  BOTTOM_INPUT_OFFSET_PX,
  CIRC_LABEL_GAP_PX,
  HANDLE_R_PX,
  LABEL_INPUT_W_PX,
  REMOVE_R_PX,
  type SectionMeta,
  sectionEdgeRight,
} from "./layout";

type Props = {
  sections: SectionMeta[];
  silhouetteScale: number;
  silhouetteCenter: number;
  silhouetteX: number;
  silhouetteY: number;
  silhouetteW: number;
  bottomShape: Shape;
  diameterLabelX: number;
  handlers: DragHandlers;
};

/** All pointer-driven controls overlaid on the silhouette:
 *
 *  - **Internal boundary bands** between adjacent sections (drag → height
 *    redistribution). Rendered first so the diameter handles end up on
 *    top and win hit-testing in the overlap region.
 *  - **Bottom-of-toy band** (drag → grow / shrink the last section).
 *  - **Diameter handles** at each section's bottom-right corner. Drawn
 *    after the bands so a click on a small handle catches first; clicks
 *    elsewhere on a band fall through to the band.
 *  - **× remove buttons** to the right of the rightmost input column. */
const DragLayer = ({
  sections,
  silhouetteScale,
  silhouetteCenter,
  silhouetteX,
  silhouetteY,
  silhouetteW,
  bottomShape,
  diameterLabelX,
  handlers,
}: Props) => {
  const removeSection = useToyStore((s) => s.removeSection);
  const sectionsLen = sections.length;
  const bandWidth = silhouetteW + 16;
  const bandX = silhouetteX - 8;

  return (
    <>
      {/* Internal boundary drag bands */}
      {sections.slice(0, -1).map((meta) => {
        const boundaryMm = meta.bottomMm;
        const y = silhouetteY + boundaryMm * silhouetteScale;
        return (
          <rect
            key={`b-${meta.section.id}`}
            className="cone-editor-handle-boundary"
            x={bandX}
            y={y - 4}
            width={bandWidth}
            height={8}
            rx={4}
            onPointerDown={(e) =>
              handlers.onBoundaryPointerDown(e, meta.section.id, boundaryMm)
            }
            onPointerMove={handlers.onBoundaryPointerMove}
            onPointerUp={handlers.onPointerUp}
            onPointerCancel={handlers.onPointerUp}
          />
        );
      })}

      {/* Bottom-of-toy drag band */}
      {sectionsLen > 0 &&
        (() => {
          const last = sections[sectionsLen - 1];
          const bottomMm = last.bottomMm;
          const y = silhouetteY + bottomMm * silhouetteScale;
          return (
            <rect
              key="bottom"
              className="cone-editor-handle-boundary cone-editor-handle-bottom"
              x={bandX}
              y={y - 4}
              width={bandWidth}
              height={8}
              rx={4}
              onPointerDown={(e) =>
                handlers.onBottomPointerDown(e, last.section.id, bottomMm, last.topMm)
              }
              onPointerMove={handlers.onBottomPointerMove}
              onPointerUp={handlers.onPointerUp}
              onPointerCancel={handlers.onPointerUp}
            />
          );
        })()}

      {/* Diameter drag handles — at the section's bottom-right corner.
          The bottom-shape cap inherits its width from the section above,
          so it doesn't get a handle. */}
      {sections.map((meta) => {
        const isShapedBottomCap =
          meta.isLast && sectionsLen > 1 && bottomShape !== Shape.FLAT;
        if (isShapedBottomCap) return null;
        const cx = sectionEdgeRight(meta, silhouetteScale, silhouetteCenter);
        const cy = silhouetteY + meta.bottomMm * silhouetteScale;
        return (
          <circle
            key={`d-${meta.section.id}`}
            className="cone-editor-handle cone-editor-handle-diameter"
            cx={cx}
            cy={cy}
            r={HANDLE_R_PX}
            onPointerDown={(e) =>
              handlers.onDiameterPointerDown(e, meta.section.id, cx)
            }
            onPointerMove={handlers.onDiameterPointerMove}
            onPointerUp={handlers.onPointerUp}
            onPointerCancel={handlers.onPointerUp}
          />
        );
      })}

      {/* Per-section × remove button — sits to the right of the
          circumference input (the rightmost input). The bottom
          section's inputs are below the silhouette, so the button
          follows them there. */}
      {sectionsLen > 1 &&
        sections.map((meta) => {
          const circRight =
            diameterLabelX + LABEL_INPUT_W_PX + CIRC_LABEL_GAP_PX + LABEL_INPUT_W_PX;
          const cx = circRight + REMOVE_R_PX + 2;
          const cy = meta.isLast
            ? silhouetteY + meta.bottomMm * silhouetteScale + BOTTOM_INPUT_OFFSET_PX
            : silhouetteY + meta.midMm * silhouetteScale;
          return (
            <g
              key={`x-${meta.section.id}`}
              className="cone-editor-remove"
              onClick={(e) => {
                e.stopPropagation();
                removeSection(meta.section.id);
              }}
              role="button"
              aria-label={`Remove section ${meta.index + 1}`}
            >
              <circle cx={cx} cy={cy} r={REMOVE_R_PX} />
              <text x={cx} y={cy + 3} textAnchor="middle">×</text>
            </g>
          );
        })}
    </>
  );
};

export default DragLayer;
