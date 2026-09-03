import {
  Shape,
  sectionBottomCurveAngle,
  sectionTopCurveAngle,
  type ToySection,
} from "../toyMachine";

// ─── Body section ──────────────────────────────────────────────────────

export type SectionBodyGeometry = {
  /** x-translate for the section's <g> wrapper. */
  x: number;
  /** SVG path d-string for the section's outline. */
  d: string;
};

/** Geometry for a body section: cubic-Bézier sides with control points
 *  derived from the section's top/bottom rim angles. Default angles
 *  (top=0°, bottom=180°) reproduce the legacy h/2 vertical taper. */
export const sectionBodyGeometry = (
  section: ToySection,
  scaleFactor: number,
  previousDiameter: number,
  totalWidth: number,
): SectionBodyGeometry => {
  const x = (totalWidth - Math.max(section.diameter, previousDiameter) * scaleFactor) / 2;
  const diameter = section.diameter * scaleFactor;
  const prevDiameter = previousDiameter * scaleFactor;
  const height = section.height * scaleFactor;

  const diffPrev = Math.max(0, diameter - prevDiameter) / 2;
  const diff = Math.max(0, prevDiameter - diameter) / 2;

  // Side-wall control-point magnitude — kept at h/2 to match the legacy
  // smooth-S taper at default angles.
  const m = height / 2;
  const θTop = (sectionTopCurveAngle(section) * Math.PI) / 180;
  const θBot = (sectionBottomCurveAngle(section) * Math.PI) / 180;
  const sinTop = Math.sin(θTop);
  const cosTop = Math.cos(θTop);
  const sinBot = Math.sin(θBot);
  const cosBot = Math.cos(θBot);

  // Anchor coordinates within the translated <g>. Top edge sits on y=0,
  // bottom edge on y=h; smaller-diameter end is centered against the wider
  // end via diff / diffPrev.
  const xTL = diffPrev;
  const xTR = prevDiameter + diffPrev;
  const xBL = diff;
  const xBR = diameter + diff;

  // CP placement: at a left anchor (xL, y), angle θ → CP at
  // (xL − sin(θ)·m, y + cos(θ)·m). Right anchor mirrors the x term.
  const cpTopLeftX = xTL - sinTop * m;
  const cpTopLeftY = cosTop * m;
  const cpTopRightX = xTR + sinTop * m;
  const cpTopRightY = cosTop * m;
  const cpBotLeftX = xBL - sinBot * m;
  const cpBotLeftY = height + cosBot * m;
  const cpBotRightX = xBR + sinBot * m;
  const cpBotRightY = height + cosBot * m;

  const d = [
    `M ${xTL} 0`,
    `C ${cpTopLeftX} ${cpTopLeftY} ${cpBotLeftX} ${cpBotLeftY} ${xBL} ${height}`,
    `L ${xBR} ${height}`,
    `C ${cpBotRightX} ${cpBotRightY} ${cpTopRightX} ${cpTopRightY} ${xTR} 0`,
  ].join(" ");

  return { x, d };
};

// ─── Cap shapes ────────────────────────────────────────────────────────

export type Orientation = "top" | "bottom";

type CapShapeInput = {
  diameter: number;
  /** y of the base edge — where the cap meets the adjacent body section. */
  baseY: number;
  /** y of the apex — the tip of the cap. */
  apexY: number;
  /** Omit the closing `Z` so the base edge isn't double-stroked by the
   *  adjacent body section. */
  openBase: boolean;
};

type ShapeRenderer = (g: CapShapeInput) => string;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const renderFlat: ShapeRenderer = ({ diameter, baseY, apexY }) =>
  `M 0 ${baseY} L ${diameter} ${baseY} L ${diameter} ${apexY} L 0 ${apexY} Z`;

// Symmetric cubic with both inner control points at y = cpY. For such a
// curve the apex reaches y = baseY/4 + 3·cpY/4, so to land it on apexY we
// need cpY = lerp(baseY, apexY, 4/3) — the CPs sit *past* the apex on
// purpose (otherwise the curve bottoms out 25% short of apexY).
const renderEgg: ShapeRenderer = ({ diameter, baseY, apexY, openBase }) => {
  const cpY = lerp(baseY, apexY, 4 / 3);
  const close = openBase ? "" : " Z";
  return `M 0 ${baseY} C 0 ${cpY} ${diameter} ${cpY} ${diameter} ${baseY}${close}`;
};

// Same apex math as egg, but both CPs collapse onto the centerline (x = r),
// which pulls the silhouette toward a cone profile.
const renderCone: ShapeRenderer = ({ diameter, baseY, apexY, openBase }) => {
  const r = diameter / 2;
  const cpY = lerp(baseY, apexY, 4 / 3);
  const close = openBase ? "" : " Z";
  return `M 0 ${baseY} C ${r} ${cpY} ${r} ${cpY} ${diameter} ${baseY}${close}`;
};

// Two cubics meeting at the apex (r, apexY). Side CPs sit 15% of the way
// from the base toward the apex, pulled toward the center axis (0.4r / 1.6r)
// so the sides bow inward (concave). Apex CPs sit on the apex line so the
// tangents at the tip are horizontal — slightly rounded apex.
const renderSpike: ShapeRenderer = ({ diameter, baseY, apexY, openBase }) => {
  const r = diameter / 2;
  const sideCpY = lerp(baseY, apexY, 0.15);
  const close = openBase ? "" : " Z";
  return (
    `M 0 ${baseY} ` +
    `C ${r * 0.4} ${sideCpY} ${r * 0.78} ${apexY} ${r} ${apexY} ` +
    `C ${r * 1.22} ${apexY} ${r * 1.6} ${sideCpY} ${diameter} ${baseY}${close}`
  );
};

const shapeRenderers: Record<Shape, ShapeRenderer> = {
  [Shape.FLAT]: renderFlat,
  [Shape.EGG]: renderEgg,
  [Shape.CONE]: renderCone,
  [Shape.SPIKE]: renderSpike,
};

export const capPath = (
  shape: Shape,
  orientation: Orientation,
  diameter: number,
  height: number,
  openAdjacentEdge: boolean,
): string => {
  const isTop = orientation === "top";
  return shapeRenderers[shape]({
    diameter,
    baseY: isTop ? height : 0,
    apexY: isTop ? 0 : height,
    openBase: !isTop && openAdjacentEdge,
  });
};

export type CapSectionGeometry = {
  x: number;
  d: string;
};

/** Geometry for a cap section: width inherits from the section above for
 *  bottom caps so the silhouette stays continuous; top caps use their own
 *  diameter. */
export const capSectionGeometry = (
  section: ToySection,
  shape: Shape,
  orientation: Orientation,
  scaleFactor: number,
  previousDiameter: number,
  totalWidth: number,
  hasAdjacent: boolean,
): CapSectionGeometry => {
  const capWidth =
    (orientation === "bottom" ? previousDiameter : section.diameter) * scaleFactor;
  const height = section.height * scaleFactor;
  return {
    x: (totalWidth - capWidth) / 2,
    d: capPath(shape, orientation, capWidth, height, hasAdjacent),
  };
};
