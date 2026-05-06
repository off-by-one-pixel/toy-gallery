import { type RimPreset } from "../../toyMachine";
import type { EditorLayout } from "./hooks/useEditorLayout";
import {
  BAND_HALF_H_PX,
  BAND_OVERHANG_PX,
  BOTTOM_INPUT_OFFSET_PX,
  CIRC_LABEL_GAP_PX,
  LABEL_INPUT_W_PX,
  LEADER_LEAD_OUT_PX,
  REMOVE_R_PX,
  RIM_BUTTON_R_PX,
  RULER_AXIS_X_PX,
  RULER_WIDTH_PX,
  type SectionMeta,
  sectionEdgeLeftAtBottom,
  sectionEdgeLeftAtTop,
  sectionEdgeRight,
  sectionInputY,
} from "./layout";

// ─── mm → px conversion (vertical axis) ────────────────────────────────

export const mmToY = (mm: number, layout: EditorLayout): number =>
  layout.silhouetteY + mm * layout.silhouetteScale;

// ─── Section labels ────────────────────────────────────────────────────

export type HeightRowGeometry = {
  yMid: number;
  leaderD: string;
};

export const heightRowGeometry = (
  meta: SectionMeta,
  layout: EditorLayout,
  x: number,
): HeightRowGeometry => {
  const { silhouetteScale, silhouetteCenter } = layout;
  const yTop = mmToY(meta.topMm, layout);
  const yMid = mmToY(meta.midMm, layout);
  const yBottom = mmToY(meta.bottomMm, layout);
  const inputRight = x + LABEL_INPUT_W_PX;
  const bendX = inputRight + LEADER_LEAD_OUT_PX;
  const leftAtTop = sectionEdgeLeftAtTop(meta, silhouetteScale, silhouetteCenter);
  const leftAtBottom = sectionEdgeLeftAtBottom(meta, silhouetteScale, silhouetteCenter);
  const leaderD = [
    `M ${inputRight + 2} ${yMid} L ${bendX} ${yMid}`,
    `M ${leftAtTop} ${yTop} L ${bendX} ${yTop} L ${bendX} ${yBottom} L ${leftAtBottom} ${yBottom}`,
  ].join(" ");
  return { yMid, leaderD };
};

export type DiameterRowGeometry = {
  inputY: number;
  leaderD: string;
};

export const diameterRowGeometry = (
  meta: SectionMeta,
  layout: EditorLayout,
  x: number,
): DiameterRowGeometry => {
  const { silhouetteScale, silhouetteCenter, silhouetteY } = layout;
  const yBottom = mmToY(meta.bottomMm, layout);
  const inputY = sectionInputY(meta, silhouetteScale, silhouetteY);
  const sectionEdgeX = sectionEdgeRight(meta, silhouetteScale, silhouetteCenter);
  const bendX = x - 2 - LEADER_LEAD_OUT_PX;
  const leaderD = `M ${x - 2} ${inputY} L ${bendX} ${inputY} L ${bendX} ${yBottom} L ${sectionEdgeX} ${yBottom}`;
  return { inputY, leaderD };
};

// ─── Rim preset buttons ────────────────────────────────────────────────

const RIM_TICK_R_PX = RIM_BUTTON_R_PX - 2;
const RIM_INSET_PX = RIM_BUTTON_R_PX + 4;

export type RimButtonPos = { cx: number; cy: number };

export type RimButtonsGeometry = {
  top: RimButtonPos;
  bot: RimButtonPos;
};

export const rimButtonsGeometry = (
  meta: SectionMeta,
  layout: EditorLayout,
): RimButtonsGeometry => {
  const sectionPx = (meta.bottomMm - meta.topMm) * layout.silhouetteScale;
  const inset = Math.min(RIM_INSET_PX, sectionPx / 2 - 1);
  const cx = layout.silhouetteCenter;
  return {
    top: { cx, cy: mmToY(meta.topMm, layout) + inset },
    bot: { cx, cy: mmToY(meta.bottomMm, layout) - inset },
  };
};

export type RimTickLine = { x1: number; y1: number; x2: number; y2: number };

/** Full <line> attributes for the directional tick inside a preset button. */
export const rimTickLine = (
  cx: number,
  cy: number,
  preset: RimPreset,
): RimTickLine => {
  const r = (preset * Math.PI) / 180;
  return {
    x1: cx,
    y1: cy,
    x2: cx - Math.sin(r) * RIM_TICK_R_PX,
    y2: cy + Math.cos(r) * RIM_TICK_R_PX,
  };
};

// ─── Reference guides ──────────────────────────────────────────────────

export type GuidesXRange = { xLeft: number; xRight: number };

export const guidesXRange = (layout: EditorLayout): GuidesXRange => ({
  xLeft: Math.max(8, RULER_WIDTH_PX - 60),
  xRight: layout.size.w - 8,
});

export type SizeGuideGeometry = {
  xLeft: number;
  xRight: number;
  yTop: number;
  yBot: number;
};

export const sizeGuideGeometry = (
  knownSizeMm: number,
  layout: EditorLayout,
): SizeGuideGeometry => {
  const half = (knownSizeMm * layout.silhouetteScale) / 2;
  return {
    xLeft: layout.silhouetteCenter - half,
    xRight: layout.silhouetteCenter + half,
    yTop: layout.silhouetteY - 8,
    yBot: layout.silhouetteY + layout.silhouetteH + 12,
  };
};

// ─── Drag layer ────────────────────────────────────────────────────────

export type BandStripeGeometry = {
  x: number;
  width: number;
  halfHeight: number;
};

export const bandStripeGeometry = (
  layout: EditorLayout,
): BandStripeGeometry => ({
  x: layout.silhouetteX - BAND_OVERHANG_PX,
  width: layout.silhouetteW + BAND_OVERHANG_PX * 2,
  halfHeight: BAND_HALF_H_PX,
});

export type BandRect = { x: number; y: number; width: number; height: number; rx: number };

/** Full SVG rect attributes for a horizontal drag band centered on a y in mm. */
export const bandRect = (mm: number, layout: EditorLayout): BandRect => {
  const { x, width, halfHeight } = bandStripeGeometry(layout);
  return {
    x,
    y: mmToY(mm, layout) - halfHeight,
    width,
    height: halfHeight * 2,
    rx: halfHeight,
  };
};

export const diameterHandlePosition = (
  meta: SectionMeta,
  layout: EditorLayout,
): { cx: number; cy: number } => ({
  cx: sectionEdgeRight(meta, layout.silhouetteScale, layout.silhouetteCenter),
  cy: mmToY(meta.bottomMm, layout),
});

export const removeButtonPosition = (
  meta: SectionMeta,
  layout: EditorLayout,
  showSectionCircumference: boolean,
): { cx: number; cy: number } => {
  const lastInputRight = showSectionCircumference
    ? layout.diameterLabelX + LABEL_INPUT_W_PX + CIRC_LABEL_GAP_PX + LABEL_INPUT_W_PX
    : layout.diameterLabelX + LABEL_INPUT_W_PX;
  const cx = lastInputRight + REMOVE_R_PX + 2;
  const cy = meta.isLast
    ? mmToY(meta.bottomMm, layout) + BOTTOM_INPUT_OFFSET_PX
    : mmToY(meta.midMm, layout);
  return { cx, cy };
};

// ─── Ruler ─────────────────────────────────────────────────────────────

export type RulerGeometry = {
  axisX: number;
  axisY1: number;
  axisY2: number;
  tickInner: number;
  tickOuter: number;
  labelX: number;
  unitY: number;
};

export const rulerGeometry = (layout: EditorLayout): RulerGeometry => ({
  axisX: RULER_AXIS_X_PX,
  axisY1: layout.silhouetteY,
  axisY2: layout.silhouetteY + layout.silhouetteH,
  tickInner: RULER_AXIS_X_PX + 6,
  tickOuter: RULER_AXIS_X_PX - 6,
  labelX: RULER_AXIS_X_PX - 10,
  unitY: layout.silhouetteY - 8,
});

// ─── Total readout ─────────────────────────────────────────────────────

export const totalReadoutPosition = (
  layout: EditorLayout,
): { x: number; y: number } => ({
  x: layout.silhouetteCenter,
  y: layout.silhouetteY + layout.silhouetteH + 18,
});
