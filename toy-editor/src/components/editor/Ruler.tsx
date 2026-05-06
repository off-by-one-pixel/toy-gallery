import { fmtUnitNum } from "../../util/fmt";
import { useEditorUnit } from "../unit";
import { useEditorLayoutCtx } from "./EditorLayoutContext";
import { mmToY, rulerGeometry } from "./geometry";

const Ruler = () => {
  const layout = useEditorLayoutCtx();
  const unit = useEditorUnit();
  const { axisX, axisY1, axisY2, tickInner, tickOuter, labelX, unitY } =
    rulerGeometry(layout);
  const ticks = [0, ...layout.sectionMeta.map((s) => s.bottomMm)];

  return (
    <g className="cone-editor-ruler" aria-hidden>
      <line
        className="cone-editor-ruler-axis"
        x1={axisX}
        x2={axisX}
        y1={axisY1}
        y2={axisY2}
      />
      {ticks.map((mm, i) => {
        const y = mmToY(mm, layout);
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
              {fmtUnitNum(mm, unit)}
            </text>
          </g>
        );
      })}
      <text
        className="cone-editor-ruler-unit"
        x={labelX}
        y={unitY}
        textAnchor="end"
      >
        {unit.id}
      </text>
    </g>
  );
};

export default Ruler;
