import { Shape, type StyleOption, type ToySection } from "../toyMachine";
import { capSectionGeometry, type Orientation } from "./silhouetteGeometry";

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
  const { x, d } = capSectionGeometry(
    section,
    shape,
    orientation,
    scaleFactor,
    previousDiameter,
    totalWidth,
    hasAdjacent,
  );

  return (
    <g
      className={interactive ? "cone-editor-part" : undefined}
      transform={`translate(${x}, 0)`}
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
