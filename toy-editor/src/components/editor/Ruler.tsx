import { fmtUnitNum } from "../../util/fmt";
import { useEditorUnit } from "../unit";
import type { SectionMeta } from "./layout";

type Props = {
  sections: SectionMeta[];
  silhouetteScale: number;
  silhouetteY: number;
  silhouetteH: number;
  rulerAxisX: number;
};

/** Vertical mm ruler at the left of the canvas: axis line + tick marks
 *  at section boundaries + numeric labels in the active display unit. */
const Ruler = ({
  sections,
  silhouetteScale,
  silhouetteY,
  silhouetteH,
  rulerAxisX,
}: Props) => {
  const unit = useEditorUnit();
  const tickInner = rulerAxisX + 6;
  const tickOuter = rulerAxisX - 6;
  const labelX = rulerAxisX - 10;
  const ticks = [{ mm: 0 }, ...sections.map((s) => ({ mm: s.bottomMm }))];

  return (
    <g className="cone-editor-ruler" aria-hidden>
      <line
        className="cone-editor-ruler-axis"
        x1={rulerAxisX}
        x2={rulerAxisX}
        y1={silhouetteY}
        y2={silhouetteY + silhouetteH}
      />
      {ticks.map((t, i) => {
        const y = silhouetteY + t.mm * silhouetteScale;
        return (
          <g key={i}>
            <line
              className="cone-editor-ruler-tick"
              x1={tickOuter}
              x2={tickInner}
              y1={y}
              y2={y}
            />
            <text
              className="cone-editor-ruler-label"
              x={labelX}
              y={y + 4}
              textAnchor="end"
            >
              {fmtUnitNum(t.mm, unit)}
            </text>
          </g>
        );
      })}
      <text
        className="cone-editor-ruler-unit"
        x={labelX}
        y={silhouetteY - 8}
        textAnchor="end"
      >
        {unit.id}
      </text>
    </g>
  );
};

export default Ruler;
