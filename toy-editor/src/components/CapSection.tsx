import type { Shape, StyleOption, ToySection } from "../toyMachine";

type Orientation = "top" | "bottom";

type Props = {
  section: ToySection;
  shape: Shape;
  orientation: Orientation;
  scaleFactor: number;
  /** Diameter of the section above. Used for bottom caps so the top edge
   *  aligns with the previous section. Ignored for top caps. */
  previousDiameter?: number;
  totalWidth: number;
  style: StyleOption;
  onSelect?: (id: number) => void;
  interactive?: boolean;
  /** True when the adjacent body edge will be stroked by the neighboring
   *  section, so we skip re-stroking it here. */
  hasAdjacent?: boolean;
};

type CapGeometry = {
  diameter: number;
  /** y of the base edge — where the cap meets the adjacent body section. */
  baseY: number;
  /** y of the apex — the tip of the cap. */
  apexY: number;
  /** Omit the closing `Z` so the base edge isn't double-stroked by the
   *  adjacent body section. */
  openBase: boolean;
};

type ShapeRenderer = (g: CapGeometry) => string;

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
  FLAT: renderFlat,
  EGG: renderEgg,
  CONE: renderCone,
  SPIKE: renderSpike,
};

const capPath = (
  shape: Shape,
  orientation: Orientation,
  diameter: number,
  h: number,
  openAdjacentEdge: boolean,
): string => {
  const isTop = orientation === "top";
  // Top caps always close at the base — the junction with the section below
  // gets re-stroked but that avoids missing/dim outlines.
  return shapeRenderers[shape]({
    diameter,
    baseY: isTop ? h : 0,
    apexY: isTop ? 0 : h,
    openBase: !isTop && openAdjacentEdge,
  });
};

const CapSection = ({
  section,
  shape,
  orientation,
  scaleFactor,
  previousDiameter = 0,
  totalWidth,
  style,
  onSelect,
  interactive = true,
  hasAdjacent = false,
}: Props) => {
  // Bottom caps take their width from the section above so the silhouette is
  // continuous; top caps use their own diameter (they have no predecessor).
  const capWidth =
    (orientation === "bottom" ? previousDiameter : section.diameter) * scaleFactor;
  const height = section.height * scaleFactor;
  const d = capPath(shape, orientation, capWidth, height, hasAdjacent);

  return (
    <g
      className={interactive ? "cone-editor-part" : undefined}
      transform={`translate(${(totalWidth - capWidth) / 2}, 0)`}
      onClick={onSelect ? () => onSelect(section.id) : undefined}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      style={{ cursor: onSelect ? "pointer" : undefined }}
    >
      <path
        d={d}
        fill={style.color}
        stroke={style.borderColor}
        strokeWidth={style.borderWidth}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
};

export default CapSection;
