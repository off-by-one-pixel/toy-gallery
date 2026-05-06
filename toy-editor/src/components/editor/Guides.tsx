import { useToyStore } from "../../toyMachine";
import { fmtUnit } from "../../util/fmt";
import { useEditorUnit } from "../unit";
import { useEditorLayoutCtx } from "./EditorLayoutContext";
import { guidesXRange, mmToY, sizeGuideGeometry } from "./geometry";

const Guides = () => {
  const layout = useEditorLayoutCtx();
  const insertableMm = useToyStore((s) => s.insertableLengthMm);
  const knownTotalMm = useToyStore((s) => s.knownTotalMm);
  const knownSizeMm = useToyStore((s) => s.knownSizeMm);
  const unit = useEditorUnit();

  const xRange = guidesXRange(layout);

  return (
    <g className="cone-editor-guides" pointerEvents="none">
      {insertableMm != null && insertableMm >= 0 && (
        <HorizontalGuide
          {...xRange}
          y={mmToY(insertableMm, layout)}
          label={`insertable ${fmtUnit(insertableMm, unit)}`}
        />
      )}
      {knownTotalMm != null && knownTotalMm >= 0 && (
        <HorizontalGuide
          {...xRange}
          y={mmToY(knownTotalMm, layout)}
          label={`total ${fmtUnit(knownTotalMm, unit)}`}
        />
      )}
      {knownSizeMm != null && knownSizeMm > 0 && (
        <SizeGuide knownSizeMm={knownSizeMm} unitLabel={fmtUnit(knownSizeMm, unit)} />
      )}
    </g>
  );
};

const HorizontalGuide = ({
  y,
  xLeft,
  xRight,
  label,
}: {
  y: number;
  xLeft: number;
  xRight: number;
  label: string;
}) => (
  <>
    <line className="cone-editor-guide" x1={xLeft} x2={xRight} y1={y} y2={y} />
    <text
      className="cone-editor-guide-label"
      x={xRight}
      y={y - 4}
      textAnchor="end"
    >
      {label}
    </text>
  </>
);

const SizeGuide = ({
  knownSizeMm,
  unitLabel,
}: {
  knownSizeMm: number;
  unitLabel: string;
}) => {
  const layout = useEditorLayoutCtx();
  const { xLeft, xRight, yTop, yBot } = sizeGuideGeometry(knownSizeMm, layout);
  return (
    <>
      <line className="cone-editor-guide" x1={xLeft} x2={xLeft} y1={yTop} y2={yBot} />
      <line className="cone-editor-guide" x1={xRight} x2={xRight} y1={yTop} y2={yBot} />
      <text
        className="cone-editor-guide-label"
        x={layout.silhouetteCenter}
        y={yTop - 2}
        textAnchor="middle"
      >
        Ø {unitLabel}
      </text>
    </>
  );
};

export default Guides;
