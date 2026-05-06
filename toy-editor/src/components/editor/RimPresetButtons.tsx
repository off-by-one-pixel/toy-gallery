import {
  Shape,
  sectionBottomPreset,
  sectionTopPreset,
  useToyStore,
  type RimPreset,
} from "../../toyMachine";
import { useEditorLayoutCtx } from "./EditorLayoutContext";
import { useEditorUiStore } from "./editorUiStore";
import { rimButtonsGeometry, rimTickLine, type RimButtonPos } from "./geometry";
import { RIM_BUTTON_R_PX } from "./layout";

type ButtonProps = RimButtonPos & {
  preset: RimPreset;
  ariaLabel: string;
  onClick: () => void;
};

const PresetButton = ({ cx, cy, preset, ariaLabel, onClick }: ButtonProps) => (
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
    <line {...rimTickLine(cx, cy, preset)} />
  </g>
);

const RimPresetButtons = () => {
  const layout = useEditorLayoutCtx();
  const bottomShape = useToyStore((s) => s.bottomShape);
  const cycleTop = useToyStore((s) => s.cycleTopPreset);
  const cycleBot = useToyStore((s) => s.cycleBottomPreset);
  const hoveredSectionId = useEditorUiStore((s) => s.hoveredSectionId);
  const setHoveredSectionId = useEditorUiStore((s) => s.setHoveredSectionId);

  const meta = layout.sectionMeta.find((m) => m.section.id === hoveredSectionId);
  if (!meta) return null;
  const isCappedLast = meta.isLast && bottomShape !== Shape.FLAT;
  if (meta.isFirst || isCappedLast) return null;

  const { top: topPos, bot: botPos } = rimButtonsGeometry(meta, layout);
  const top = sectionTopPreset(meta.section);
  const bot = sectionBottomPreset(meta.section);

  return (
    <g
      onMouseEnter={() => setHoveredSectionId(meta.section.id)}
      onMouseLeave={() => setHoveredSectionId(null)}
    >
      <PresetButton
        {...topPos}
        preset={top}
        ariaLabel={`Section ${meta.index + 1} top preset (${top}°)`}
        onClick={() => cycleTop(meta.section.id)}
      />
      <PresetButton
        {...botPos}
        preset={bot}
        ariaLabel={`Section ${meta.index + 1} bottom preset (${bot}°)`}
        onClick={() => cycleBot(meta.section.id)}
      />
    </g>
  );
};

export default RimPresetButtons;
