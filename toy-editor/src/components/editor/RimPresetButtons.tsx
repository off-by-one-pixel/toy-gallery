import {
  Shape,
  sectionBottomPreset,
  sectionTopPreset,
  useToyStore,
  type RimPreset,
} from "../../toyMachine";
import { type SectionMeta } from "./layout";

const BUTTON_R_PX = 9;
const TICK_R_PX = BUTTON_R_PX - 2;
const INSET_PX = BUTTON_R_PX + 4;

type Props = {
  sections: SectionMeta[];
  silhouetteScale: number;
  silhouetteCenter: number;
  silhouetteY: number;
  bottomShape: Shape;
  hoveredSectionId: number | null;
  onHover: (id: number | null) => void;
};

const tickEnd = (cx: number, cy: number, preset: RimPreset) => {
  const r = (preset * Math.PI) / 180;
  return {
    x: cx - Math.sin(r) * TICK_R_PX,
    y: cy + Math.cos(r) * TICK_R_PX,
  };
};

type ButtonProps = {
  cx: number;
  cy: number;
  preset: RimPreset;
  ariaLabel: string;
  onClick: () => void;
};

const PresetButton = ({ cx, cy, preset, ariaLabel, onClick }: ButtonProps) => {
  const tip = tickEnd(cx, cy, preset);
  return (
    <g
      className="cone-editor-rim-btn"
      role="button"
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <circle cx={cx} cy={cy} r={BUTTON_R_PX} />
      <line x1={cx} y1={cy} x2={tip.x} y2={tip.y} />
    </g>
  );
};

const RimPresetButtons = ({
  sections,
  silhouetteScale,
  silhouetteCenter,
  silhouetteY,
  bottomShape,
  hoveredSectionId,
  onHover,
}: Props) => {
  const cycleTop = useToyStore((s) => s.cycleTopPreset);
  const cycleBot = useToyStore((s) => s.cycleBottomPreset);

  const meta = sections.find((m) => m.section.id === hoveredSectionId);
  if (!meta) return null;
  const isCappedLast = meta.isLast && bottomShape !== Shape.FLAT;
  if (meta.isFirst || isCappedLast) return null;

  const cx = silhouetteCenter;
  const sectionPx = (meta.bottomMm - meta.topMm) * silhouetteScale;
  const inset = Math.min(INSET_PX, sectionPx / 2 - 1);
  const topCy = silhouetteY + meta.topMm * silhouetteScale + inset;
  const botCy = silhouetteY + meta.bottomMm * silhouetteScale - inset;

  const top = sectionTopPreset(meta.section);
  const bot = sectionBottomPreset(meta.section);

  return (
    <g
      onMouseEnter={() => onHover(meta.section.id)}
      onMouseLeave={() => onHover(null)}
    >
      <PresetButton
        cx={cx}
        cy={topCy}
        preset={top}
        ariaLabel={`Section ${meta.index + 1} top preset (${top}°)`}
        onClick={() => cycleTop(meta.section.id)}
      />
      <PresetButton
        cx={cx}
        cy={botCy}
        preset={bot}
        ariaLabel={`Section ${meta.index + 1} bottom preset (${bot}°)`}
        onClick={() => cycleBot(meta.section.id)}
      />
    </g>
  );
};

export default RimPresetButtons;
