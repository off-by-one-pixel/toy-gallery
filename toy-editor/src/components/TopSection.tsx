import type { StyleOption, ToySection } from "../toyMachine";

type Props = {
  section: ToySection;
  scaleFactor: number;
  shape: string;
  style: StyleOption;
  totalWidth: number;
  onSelect?: (id: number) => void;
  interactive?: boolean;
};

const TopSection = ({
  section,
  scaleFactor,
  shape,
  style,
  totalWidth,
  onSelect,
  interactive = true,
}: Props) => {
  const diameter = section.diameter * scaleFactor;
  const height = section.height * scaleFactor;

  const isEgg = shape === "egg";
  const radius = diameter / 2;
  let x1, x2;

  if (isEgg) {
    x1 = 0;
    x2 = diameter;
  } else {
    x1 = radius;
    x2 = radius;
  }

  return (
    <g
      className={interactive ? "cone-editor-part" : undefined}
      transform={`translate(${(totalWidth - diameter) / 2}, 0)`}
      onClick={onSelect ? () => onSelect(section.id) : undefined}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      style={{ cursor: onSelect ? "pointer" : undefined }}
    >
      <path
        d={`
          M 0 ${height}
          C ${x1} 0 ${x2} 0 ${diameter} ${height}
          Z
        `}
        fill={style.color}
        stroke={style.borderColor}
        strokeWidth={style.borderWidth}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
};

export default TopSection;
