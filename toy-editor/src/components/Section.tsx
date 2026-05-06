import { type StyleOption, type ToySection } from "../toyMachine";
import { sectionBodyGeometry } from "./silhouetteGeometry";

type Props = {
  section: ToySection;
  scaleFactor: number;
  previousDiameter: number;
  totalWidth: number;
  style: StyleOption;
  onSelect?: (id: number) => void;
  onHover?: (id: number | null) => void;
  interactive?: boolean;
};

const Section = ({
  section,
  scaleFactor,
  previousDiameter,
  totalWidth,
  style,
  onSelect,
  onHover,
  interactive = true,
}: Props) => {
  const { x, d } = sectionBodyGeometry(section, scaleFactor, previousDiameter, totalWidth);

  return (
    <g
      className={interactive ? "cone-editor-part" : undefined}
      transform={`translate(${x}, 0)`}
      onClick={onSelect ? () => onSelect(section.id) : undefined}
      onMouseEnter={onHover ? () => onHover(section.id) : undefined}
      onMouseLeave={onHover ? () => onHover(null) : undefined}
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

export default Section;
