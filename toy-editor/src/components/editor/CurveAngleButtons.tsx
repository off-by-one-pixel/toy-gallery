import {
  Shape,
  sectionBottomCurveAngle,
  sectionTopCurveAngle,
  useToyStore,
  type CurveAngle,
} from "../../toyMachine";
import { useEditorLayoutCtx } from "./EditorLayoutContext";
import { useEditorUiStore } from "./editorUiStore";
import { rimButtonsGeometry, rimTickLine, type RimButtonPos } from "./geometry";
import { RIM_BUTTON_R_PX } from "./layout";

type ButtonProps = RimButtonPos & {
  angle: CurveAngle;
  ariaLabel: string;
  onClick: () => void;
};

const CycleButton = ({ cx, cy, angle, ariaLabel, onClick }: ButtonProps) => (
  <g
    className="cone-editor-rim-btn"
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

const CurveAngleButtons = () => {
  const layout = useEditorLayoutCtx();
  const bottomShape = useToyStore((s) => s.bottomShape);
  const cycleTop = useToyStore((s) => s.cycleTopCurveAngle);
  const cycleBot = useToyStore((s) => s.cycleBottomCurveAngle);
  const hoveredSectionId = useEditorUiStore((s) => s.hoveredSectionId);
  const setHoveredSectionId = useEditorUiStore((s) => s.setHoveredSectionId);

  const meta = layout.sectionMeta.find((m) => m.section.id === hoveredSectionId);
  if (!meta) return null;
  const isCappedLast = meta.isLast && bottomShape !== Shape.FLAT;
  if (meta.isFirst || isCappedLast) return null;

  const { top: topPos, bot: botPos } = rimButtonsGeometry(meta, layout);
  const top = sectionTopCurveAngle(meta.section);
  const bot = sectionBottomCurveAngle(meta.section);

  return (
    <g
      onMouseEnter={() => setHoveredSectionId(meta.section.id)}
      onMouseLeave={() => setHoveredSectionId(null)}
    >
      <CycleButton
        {...topPos}
        angle={top}
        ariaLabel={`Section ${meta.index + 1} top angle (${top}°)`}
        onClick={() => cycleTop(meta.section.id)}
      />
      <CycleButton
        {...botPos}
        angle={bot}
        ariaLabel={`Section ${meta.index + 1} bottom angle (${bot}°)`}
        onClick={() => cycleBot(meta.section.id)}
      />
    </g>
  );
};

export default CurveAngleButtons;
