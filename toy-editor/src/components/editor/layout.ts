import type { Toy, ToySection } from "../../toyMachine";

/** Reserved space outside the silhouette on each side. The right side
 *  carries two inputs per section (diameter + circumference) plus the ×
 *  button; the left only needs the ruler + one input. We pad both sides
 *  to the same width so the silhouette stays centered in the canvas. */
export const RULER_WIDTH_PX = 240;
export const LABEL_WIDTH_PX = 240;
/** Horizontal gap between the diameter input and the circumference input. */
export const CIRC_LABEL_GAP_PX = 8;
/** Horizontal gap between the silhouette's edge and the input column.
 *  Drives how long each leader's horizontal arm is. Same on both sides. */
export const DIAMETER_LABEL_GAP_PX = 36;
export const HEIGHT_LABEL_GAP_PX = 36;
/** Fixed horizontal position for the overall-length ruler axis, anchored
 *  to the left edge of the canvas (independent of the silhouette layout)
 *  so it sits clearly apart from the per-section height brackets. */
export const RULER_AXIS_X_PX = 40;
/** Vertical padding inside the SVG. The top must clear the topmost
 *  diameter input box (at section midpoint − LABEL_INPUT_H_PX / 2) so it
 *  doesn't get clipped by the viewBox top. The bottom must fit the total
 *  readout AND the bottom section's diameter input, which is rendered
 *  just below the silhouette rather than at the section midpoint. */
export const VPAD_TOP_PX = 28;
export const VPAD_BOTTOM_PX = 56;
export const HANDLE_R_PX = 5;
export const REMOVE_R_PX = 9;
export const RIM_BUTTON_R_PX = 9;
export const BAND_HALF_H_PX = 4;
export const BAND_OVERHANG_PX = 8;
export const LABEL_INPUT_W_PX = 74;
export const LABEL_INPUT_H_PX = 22;
export const SNAP_THRESHOLD_MM = 2;
/** Lead-out from input box to the leader bend. */
export const LEADER_LEAD_OUT_PX = 12;
/** Vertical offset of the bottom section's input from the silhouette
 *  bottom (input center). */
export const BOTTOM_INPUT_OFFSET_PX = 22;

/** Per-section meta computed once per render — pixel-derived positions
 *  resolved against the canonical mm anchors. */
export type SectionMeta = {
  section: ToySection;
  index: number;
  /** mm offset of the section's top edge from the silhouette top. */
  topMm: number;
  /** mm offset of the section's bottom edge from the silhouette top. */
  bottomMm: number;
  /** mm offset of the section's vertical midpoint. */
  midMm: number;
  /** Diameter of the previous section (= 0 for the first section). */
  previousDiameter: number;
  isFirst: boolean;
  isLast: boolean;
};

/** Build per-section meta from a toy's sections. */
export const buildSectionMeta = (sections: Toy["sections"]): SectionMeta[] => {
  let yMm = 0;
  return sections.map((section, index) => {
    const topMm = yMm;
    const bottomMm = topMm + section.height;
    yMm = bottomMm;
    const prev = index > 0 ? sections[index - 1] : null;
    const isFirst = index === 0;
    const isLast = index === sections.length - 1 && !isFirst;
    return {
      section,
      index,
      topMm,
      bottomMm,
      midMm: (topMm + bottomMm) / 2,
      previousDiameter: prev ? prev.diameter : 0,
      isFirst,
      isLast,
    };
  });
};

/** Vertical pixel position for a section's editable input. The bottom
 *  section's input is pushed below the silhouette so it doesn't crowd
 *  the bottom cap area; all other sections sit at the section midpoint. */
export const sectionInputY = (
  meta: SectionMeta,
  silhouetteScale: number,
  silhouetteY: number,
): number => {
  if (meta.isLast) {
    return silhouetteY + meta.bottomMm * silhouetteScale + BOTTOM_INPUT_OFFSET_PX;
  }
  return silhouetteY + meta.midMm * silhouetteScale;
};

/** X position of the silhouette's right edge at a section's bottom (= where
 *  the section's diameter applies geometrically). */
export const sectionEdgeRight = (
  meta: SectionMeta,
  silhouetteScale: number,
  silhouetteCenter: number,
): number => silhouetteCenter + (meta.section.diameter * silhouetteScale) / 2;

/** X position of the silhouette's left edge at a section's TOP (where it
 *  inherits the previous section's diameter). */
export const sectionEdgeLeftAtTop = (
  meta: SectionMeta,
  silhouetteScale: number,
  silhouetteCenter: number,
): number => silhouetteCenter - (meta.previousDiameter * silhouetteScale) / 2;

/** X position of the silhouette's left edge at a section's BOTTOM. */
export const sectionEdgeLeftAtBottom = (
  meta: SectionMeta,
  silhouetteScale: number,
  silhouetteCenter: number,
): number => silhouetteCenter - (meta.section.diameter * silhouetteScale) / 2;

/** Drag-state shapes for the three pointer-drag interactions on the canvas. */
export type DragState =
  | {
      kind: "diameter";
      sectionId: number;
      pointerId: number;
      /** Cursor x − handle x at pointer-down. Subtracted on each move so
       *  the section border (not the cursor) tracks where the user grabbed. */
      offsetPx: number;
    }
  | {
      kind: "boundary";
      aboveId: number;
      pointerId: number;
      anchorBoundaryMm: number;
      offsetPx: number;
    }
  | {
      kind: "bottom";
      lastId: number;
      pointerId: number;
      offsetPx: number;
      lastTopMm: number;
    };
