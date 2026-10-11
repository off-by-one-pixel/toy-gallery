import type { Toy, ToySection } from '../../toyMachine';

export const RULER_WIDTH_PX = 240;
export const LABEL_WIDTH_PX = 240;
export const CIRC_LABEL_GAP_PX = 8;
export const DIAMETER_LABEL_GAP_PX = 36;
export const HEIGHT_LABEL_GAP_PX = 36;
export const RULER_AXIS_X_PX = 40;
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
export const LEADER_LEAD_OUT_PX = 12;
export const BOTTOM_INPUT_OFFSET_PX = 22;

export type SectionMeta = {
  section: ToySection;
  index: number;
  topMm: number;
  bottomMm: number;
  midMm: number;
  previousDiameter: number;
  isFirst: boolean;
  isLast: boolean;
};

export const buildSectionMeta = (sections: Toy['sections']): SectionMeta[] => {
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

export const sectionInputY = (meta: SectionMeta, silhouetteScale: number, silhouetteY: number): number => {
  if (meta.isLast) {
    return silhouetteY + meta.bottomMm * silhouetteScale + BOTTOM_INPUT_OFFSET_PX;
  }
  return silhouetteY + meta.midMm * silhouetteScale;
};

export const sectionEdgeRight = (meta: SectionMeta, silhouetteScale: number, silhouetteCenter: number): number =>
  silhouetteCenter + (meta.section.diameter * silhouetteScale) / 2;

export const sectionEdgeLeftAtTop = (meta: SectionMeta, silhouetteScale: number, silhouetteCenter: number): number =>
  silhouetteCenter - (meta.previousDiameter * silhouetteScale) / 2;

export const sectionEdgeLeftAtBottom = (meta: SectionMeta, silhouetteScale: number, silhouetteCenter: number): number =>
  silhouetteCenter - (meta.section.diameter * silhouetteScale) / 2;

export type DragState =
  | {
      kind: 'diameter';
      sectionId: number;
      pointerId: number;
      offsetPx: number;
    }
  | {
      kind: 'boundary';
      aboveId: number;
      pointerId: number;
      anchorBoundaryMm: number;
      offsetPx: number;
    }
  | {
      kind: 'bottom';
      lastId: number;
      pointerId: number;
      offsetPx: number;
      lastTopMm: number;
    };
