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

const capPath = (
  shape: Shape,
  orientation: Orientation,
  diameter: number,
  h: number,
  openAdjacentEdge: boolean,
): string => {
  const r = diameter / 2;
  if (shape === "flat") {
    return `M 0 0 L ${diameter} 0 L ${diameter} ${h} L 0 ${h} Z`;
  }
  if (orientation === "top") {
    // Top cap always closes; the next section below re-strokes its own top edge,
    // but keeping both avoids missing/dim outlines at the junction.
    // Inner control-point y of -h/3 sits outside the cap's box on purpose:
    // for a symmetric cubic this is what makes the apex actually reach y=0
    // (otherwise it bottoms out at h/4, leaving the cap 25% short).
    if (shape === "egg") return `M 0 ${h} C 0 ${-h / 3} ${diameter} ${-h / 3} ${diameter} ${h} Z`;
    if (shape === "cone") return `M 0 ${h} C ${r} ${-h / 3} ${r} ${-h / 3} ${diameter} ${h} Z`;
    // Spike: control points pulled toward the center axis so the sides bow
    // inward (concave); cp2/cp1 at the apex sit on y=0 so tangents are
    // horizontal at the tip, giving a slightly rounded apex.
    const leftCp1 = `${r * 0.4} ${h * 0.85}`;
    const leftCp2 = `${r * 0.78} 0`;
    const rightCp1 = `${r * 1.22} 0`;
    const rightCp2 = `${r * 1.6} ${h * 0.85}`;
    return `M 0 ${h} C ${leftCp1} ${leftCp2} ${r} 0 C ${rightCp1} ${rightCp2} ${diameter} ${h} Z`;
  }
  // Bottom cap: omit the closing `Z` on the top edge (touching the section
  // above) so the junction isn't double-stroked. Fill still auto-closes.
  const close = openAdjacentEdge ? "" : " Z";
  if (shape === "egg") return `M 0 0 C 0 ${(4 * h) / 3} ${diameter} ${(4 * h) / 3} ${diameter} 0${close}`;
  if (shape === "cone") return `M 0 0 C ${r} ${(4 * h) / 3} ${r} ${(4 * h) / 3} ${diameter} 0${close}`;
  // Spike (bottom): mirrored.
  const leftCp1 = `${r * 0.4} ${h * 0.15}`;
  const leftCp2 = `${r * 0.78} ${h}`;
  const rightCp1 = `${r * 1.22} ${h}`;
  const rightCp2 = `${r * 1.6} ${h * 0.15}`;
  return `M 0 0 C ${leftCp1} ${leftCp2} ${r} ${h} C ${rightCp1} ${rightCp2} ${diameter} 0${close}`;
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
