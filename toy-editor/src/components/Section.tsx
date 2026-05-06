import {
  sectionBottomPreset,
  sectionTopPreset,
  type StyleOption,
  type ToySection,
} from "../toyMachine";

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
  const x = (totalWidth - Math.max(section.diameter, previousDiameter) * scaleFactor) / 2;
  const diameter = section.diameter * scaleFactor;
  const prev_diameter = previousDiameter * scaleFactor;
  const height = section.height * scaleFactor;

  const diff_prev = Math.max(0, diameter - prev_diameter) / 2;
  const diff = Math.max(0, prev_diameter - diameter) / 2;

  // Side-wall control-point magnitude — kept at h/2 to match the legacy
  // smooth-S taper at default presets.
  const m = height / 2;
  const θTop = (sectionTopPreset(section) * Math.PI) / 180;
  const θBot = (sectionBottomPreset(section) * Math.PI) / 180;
  const sinTop = Math.sin(θTop);
  const cosTop = Math.cos(θTop);
  const sinBot = Math.sin(θBot);
  const cosBot = Math.cos(θBot);

  // Anchor coordinates within the translated <g>. Top edge sits on y=0,
  // bottom edge on y=h; smaller-diameter end is centered against the
  // wider end via diff / diff_prev.
  const xTL = diff_prev;
  const xTR = prev_diameter + diff_prev;
  const xBL = diff;
  const xBR = diameter + diff;

  // CP placement: at a left anchor (xL, y), preset θ → CP at
  // (xL − sin(θ)·m, y + cos(θ)·m). Right anchor mirrors the x term.
  // Default θ_top=0 + θ_bot=180 gives CPs at (xAnchor, h/2), reproducing
  // the legacy hardcoded path exactly.
  const cpTopLeftX = xTL - sinTop * m;
  const cpTopLeftY = cosTop * m;
  const cpTopRightX = xTR + sinTop * m;
  const cpTopRightY = cosTop * m;
  const cpBotLeftX = xBL - sinBot * m;
  const cpBotLeftY = height + cosBot * m;
  const cpBotRightX = xBR + sinBot * m;
  const cpBotRightY = height + cosBot * m;

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
        d={`
          M ${xTL} 0
          C ${cpTopLeftX} ${cpTopLeftY} ${cpBotLeftX} ${cpBotLeftY} ${xBL} ${height}
          L ${xBR} ${height}
          C ${cpBotRightX} ${cpBotRightY} ${cpTopRightX} ${cpTopRightY} ${xTR} 0
        `}
        fill={style.color}
        stroke={style.borderColor}
        strokeWidth={style.borderWidth}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
};

export default Section;
