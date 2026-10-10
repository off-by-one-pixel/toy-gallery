import { Shape, type StyleOption, type ToySection } from "../toyMachine";
import { capSectionGeometry, type Orientation } from "./silhouetteGeometry";

type Props = {
  section: ToySection;
  shape: Shape;
  orientation: Orientation;
  scaleFactor: number;
  previousDiameter?: number;
  totalWidth: number;
  style: StyleOption;
  interactive?: boolean;
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
    <g className={interactive ? "toy-editor-part" : undefined} transform={`translate(${x}, 0)`}>
      <path
        d={d}
        fill={section.color || style.color}
        stroke={style.borderColor}
        strokeWidth={style.borderWidth}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
};

export default CapSection;
