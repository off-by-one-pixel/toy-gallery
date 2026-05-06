import { fmtUnit } from "../../util/fmt";
import { useEditorUnit } from "../unit";

type Props = {
  insertableMm: number | null;
  knownTotalMm: number | null;
  knownSizeMm: number | null;
  silhouetteScale: number;
  silhouetteY: number;
  silhouetteH: number;
  silhouetteCenter: number;
  xLeft: number;
  xRight: number;
};

/** Reference guides on the canvas — manufacturer-stated insertable and
 *  total lengths drawn as horizontal dashed lines, and the known size
 *  drawn as a pair of vertical dashed lines at center ± d/2. Purely
 *  presentational. */
const Guides = ({
  insertableMm,
  knownTotalMm,
  knownSizeMm,
  silhouetteScale,
  silhouetteY,
  silhouetteH,
  silhouetteCenter,
  xLeft,
  xRight,
}: Props) => {
  const unit = useEditorUnit();
  return (
    <g className="cone-editor-guides" pointerEvents="none">
      {insertableMm != null && insertableMm >= 0 && (
        <HorizontalGuide
          y={silhouetteY + insertableMm * silhouetteScale}
          xLeft={xLeft}
          xRight={xRight}
          label={`insertable ${fmtUnit(insertableMm, unit)}`}
        />
      )}
      {knownTotalMm != null && knownTotalMm >= 0 && (
        <HorizontalGuide
          y={silhouetteY + knownTotalMm * silhouetteScale}
          xLeft={xLeft}
          xRight={xRight}
          label={`total ${fmtUnit(knownTotalMm, unit)}`}
        />
      )}
      {knownSizeMm != null && knownSizeMm > 0 && (
        <SizeGuide
          knownSizeMm={knownSizeMm}
          silhouetteScale={silhouetteScale}
          silhouetteY={silhouetteY}
          silhouetteH={silhouetteH}
          silhouetteCenter={silhouetteCenter}
          unitLabel={fmtUnit(knownSizeMm, unit)}
        />
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
  silhouetteScale,
  silhouetteY,
  silhouetteH,
  silhouetteCenter,
  unitLabel,
}: {
  knownSizeMm: number;
  silhouetteScale: number;
  silhouetteY: number;
  silhouetteH: number;
  silhouetteCenter: number;
  unitLabel: string;
}) => {
  const half = (knownSizeMm * silhouetteScale) / 2;
  const yTop = silhouetteY - 8;
  const yBot = silhouetteY + silhouetteH + 12;
  // The label shows the diameter the guide represents — the guide's
  // geometry is the diameter at center ± d/2.
  return (
    <>
      <line
        className="cone-editor-guide"
        x1={silhouetteCenter - half}
        x2={silhouetteCenter - half}
        y1={yTop}
        y2={yBot}
      />
      <line
        className="cone-editor-guide"
        x1={silhouetteCenter + half}
        x2={silhouetteCenter + half}
        y1={yTop}
        y2={yBot}
      />
      <text
        className="cone-editor-guide-label"
        x={silhouetteCenter}
        y={yTop - 2}
        textAnchor="middle"
      >
        Ø {unitLabel}
      </text>
    </>
  );
};

export default Guides;
