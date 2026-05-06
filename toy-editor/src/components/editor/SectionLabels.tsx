import { useToyStore } from "../../toyMachine";
import FloatingInput from "./FloatingInput";
import { useCircumferenceSync } from "./hooks/useCircumferenceSync";
import {
  CIRC_LABEL_GAP_PX,
  LABEL_INPUT_W_PX,
  LEADER_LEAD_OUT_PX,
  type SectionMeta,
  sectionEdgeLeftAtBottom,
  sectionEdgeLeftAtTop,
  sectionEdgeRight,
  sectionInputY,
} from "./layout";

type Props = {
  sections: SectionMeta[];
  silhouetteScale: number;
  silhouetteCenter: number;
  silhouetteY: number;
  heightLabelX: number;
  diameterLabelX: number;
  knownSizeMm: number | null;
};

/** Per-section editable labels: height (with bracket leader on the left),
 *  diameter (with Z-leader to the bottom-right corner), and an
 *  independent circumference (no leader, sits beside the diameter input). */
const SectionLabels = ({
  sections,
  silhouetteScale,
  silhouetteCenter,
  silhouetteY,
  heightLabelX,
  diameterLabelX,
  knownSizeMm,
}: Props) => {
  const setDiameter = useToyStore((s) => s.setDiameter);
  const setHeight = useToyStore((s) => s.setHeight);
  const { pushFromSection } = useCircumferenceSync();
  const circumferenceX = diameterLabelX + LABEL_INPUT_W_PX + CIRC_LABEL_GAP_PX;

  return (
    <>
      {sections.map((meta) => (
        <HeightRow
          key={`h-${meta.section.id}`}
          meta={meta}
          silhouetteScale={silhouetteScale}
          silhouetteCenter={silhouetteCenter}
          silhouetteY={silhouetteY}
          x={heightLabelX}
          onChange={(mm) => mm != null && setHeight(meta.section.id, mm)}
        />
      ))}

      {sections.map((meta) => (
        <DiameterRow
          key={`d-${meta.section.id}`}
          meta={meta}
          silhouetteScale={silhouetteScale}
          silhouetteCenter={silhouetteCenter}
          silhouetteY={silhouetteY}
          x={diameterLabelX}
          knownSizeMm={knownSizeMm}
          onChange={(mm) => mm != null && setDiameter(meta.section.id, mm)}
        />
      ))}

      {sections.map((meta) => (
        <FloatingInput
          key={`c-${meta.section.id}`}
          x={circumferenceX}
          yCenter={sectionInputY(meta, silhouetteScale, silhouetteY)}
          prefix="C"
          ariaLabel={`Circumference of section ${meta.index + 1}`}
          value={meta.section.circumference ?? null}
          touched={meta.section.circumference != null}
          allowEmpty
          placeholder="—"
          onChange={(v) => pushFromSection(meta.section.id, v)}
        />
      ))}
    </>
  );
};

// ─── Height row: bracket leader + foreign-object input ─────────────────

type HeightRowProps = {
  meta: SectionMeta;
  silhouetteScale: number;
  silhouetteCenter: number;
  silhouetteY: number;
  x: number;
  onChange: (mm: number | null) => void;
};

const HeightRow = ({
  meta,
  silhouetteScale,
  silhouetteCenter,
  silhouetteY,
  x,
  onChange,
}: HeightRowProps) => {
  const touched = meta.section.touched?.height ?? true;
  const yTop = silhouetteY + meta.topMm * silhouetteScale;
  const yMid = silhouetteY + meta.midMm * silhouetteScale;
  const yBottom = silhouetteY + meta.bottomMm * silhouetteScale;
  const inputRight = x + LABEL_INPUT_W_PX;
  const bendX = inputRight + LEADER_LEAD_OUT_PX;
  const sectionLeftAtTop = sectionEdgeLeftAtTop(meta, silhouetteScale, silhouetteCenter);
  const sectionLeftAtBottom = sectionEdgeLeftAtBottom(meta, silhouetteScale, silhouetteCenter);
  // Mirror of the diameter Z-leader: lead-out from the input's right edge,
  // then a vertical bracket spanning the section's full height with
  // horizontal extension lines reaching the silhouette's left edge at top
  // and bottom.
  const leaderD = [
    `M ${inputRight + 2} ${yMid} L ${bendX} ${yMid}`,
    `M ${sectionLeftAtTop} ${yTop} L ${bendX} ${yTop} L ${bendX} ${yBottom} L ${sectionLeftAtBottom} ${yBottom}`,
  ].join(" ");
  return (
    <g>
      <path
        className={`cone-editor-leader ${touched ? "is-touched" : "is-default"}`}
        d={leaderD}
      />
      <FloatingInput
        x={x}
        yCenter={yMid}
        prefix="H"
        ariaLabel={`Height of section ${meta.index + 1}`}
        value={meta.section.height}
        touched={touched}
        onChange={onChange}
      />
    </g>
  );
};

// ─── Diameter row: Z-leader + foreign-object input ─────────────────────

type DiameterRowProps = {
  meta: SectionMeta;
  silhouetteScale: number;
  silhouetteCenter: number;
  silhouetteY: number;
  x: number;
  knownSizeMm: number | null;
  onChange: (mm: number | null) => void;
};

const DiameterRow = ({
  meta,
  silhouetteScale,
  silhouetteCenter,
  silhouetteY,
  x,
  knownSizeMm,
  onChange,
}: DiameterRowProps) => {
  const touched = meta.section.touched?.diameter ?? true;
  const yBottom = silhouetteY + meta.bottomMm * silhouetteScale;
  const inputY = sectionInputY(meta, silhouetteScale, silhouetteY);
  const sectionEdgeX = sectionEdgeRight(meta, silhouetteScale, silhouetteCenter);
  const overshoots =
    knownSizeMm != null && meta.section.diameter > knownSizeMm + 0.5;
  // Z-shaped leader: a short horizontal lead-out from the input, a
  // vertical drop, then a horizontal run into the section's
  // bottom-right corner.
  const bendX = x - 2 - LEADER_LEAD_OUT_PX;
  const leaderD = `M ${x - 2} ${inputY} L ${bendX} ${inputY} L ${bendX} ${yBottom} L ${sectionEdgeX} ${yBottom}`;
  return (
    <g>
      <path
        className={`cone-editor-leader ${touched ? "is-touched" : "is-default"}`}
        d={leaderD}
      />
      <FloatingInput
        x={x}
        yCenter={inputY}
        width={LABEL_INPUT_W_PX + (overshoots ? 18 : 0)}
        prefix="Ø"
        ariaLabel={`Diameter of section ${meta.index + 1}`}
        value={meta.section.diameter}
        touched={touched}
        onChange={onChange}
        trailing={
          overshoots && (
            <span
              className="cone-editor-floating-warn"
              title="Section is wider than the known size guide"
              aria-label="Section exceeds the known size guide"
            >
              ⚠
            </span>
          )
        }
      />
    </g>
  );
};

export default SectionLabels;
