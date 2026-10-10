import { type StyleOption, type ToySection } from "../toyMachine";
import { sectionBodyGeometry } from "./silhouetteGeometry";

type Props = {
  section: ToySection;
  scaleFactor: number;
  previousDiameter: number;
  totalWidth: number;
  style: StyleOption;
  onHover?: (id: number | null) => void;
  interactive?: boolean;
};

const Section = ({
  section,
  scaleFactor,
  previousDiameter,
  totalWidth,
  style,
  onHover,
  interactive = true,
}: Props) => {
  const { x, d } = sectionBodyGeometry(section, scaleFactor, previousDiameter, totalWidth);

  return (
    <g
      className={interactive ? "toy-editor-part" : undefined}
      transform={`translate(${x}, 0)`}
      onMouseEnter={onHover ? () => onHover(section.id) : undefined}
      onMouseLeave={onHover ? () => onHover(null) : undefined}
    >
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

export default Section;
