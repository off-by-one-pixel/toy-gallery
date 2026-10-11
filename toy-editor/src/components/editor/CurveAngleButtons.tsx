import { Shape, sectionBottomCurveAngle, sectionTopCurveAngle, useToyStore, type CurveAngle } from '../../toyMachine';
import { useEditorLayoutCtx } from './EditorLayoutContext';
import { useEditorLabels } from './labels';
import { rimButtonsGeometry, rimTickLine, type RimButtonPos } from './geometry';
import { RIM_BUTTON_R_PX } from './layout';

type ButtonProps = RimButtonPos & {
  angle: CurveAngle;
  ariaLabel: string;
  onClick: () => void;
};

const CycleButton = ({ cx, cy, angle, ariaLabel, onClick }: ButtonProps) => (
  <g
    className="toy-editor-rim-btn"
    role="button"
    aria-label={ariaLabel}
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
  >
    <circle cx={cx} cy={cy} r={RIM_BUTTON_R_PX} />
    <line {...rimTickLine(cx, cy, angle)} />
  </g>
);

type Props = {
  hoveredSectionId: number | null;
  onHover: (id: number | null) => void;
};

const CurveAngleButtons = ({ hoveredSectionId, onHover }: Props) => {
  const layout = useEditorLayoutCtx();
  const labels = useEditorLabels();
  const bottomShape = useToyStore((s) => s.bottomShape);
  const cycleTop = useToyStore((s) => s.cycleTopCurveAngle);
  const cycleBot = useToyStore((s) => s.cycleBottomCurveAngle);

  const meta = layout.sectionMeta.find((m) => m.section.id === hoveredSectionId);
  if (!meta) return null;
  const isCappedLast = meta.isLast && bottomShape !== Shape.FLAT;
  if (meta.isFirst || isCappedLast) return null;

  const { top: topPos, bot: botPos } = rimButtonsGeometry(meta, layout);
  const top = sectionTopCurveAngle(meta.section);
  const bot = sectionBottomCurveAngle(meta.section);

  return (
    <g onMouseEnter={() => onHover(meta.section.id)} onMouseLeave={() => onHover(null)}>
      <CycleButton
        {...topPos}
        angle={top}
        ariaLabel={labels.sectionTopAngle(meta.index + 1, top)}
        onClick={() => cycleTop(meta.section.id)}
      />
      <CycleButton
        {...botPos}
        angle={bot}
        ariaLabel={labels.sectionBottomAngle(meta.index + 1, bot)}
        onClick={() => cycleBot(meta.section.id)}
      />
    </g>
  );
};

export default CurveAngleButtons;
