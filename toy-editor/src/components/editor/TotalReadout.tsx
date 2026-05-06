import { fmtUnit } from "../../util/fmt";
import { useEditorUnit } from "../unit";

type Props = {
  x: number;
  y: number;
  totalHeightMm: number;
  maxDiameterMm: number;
};

/** Compact summary line under the silhouette: `total NN <unit>  ·  Ø NN <unit>`. */
const TotalReadout = ({ x, y, totalHeightMm, maxDiameterMm }: Props) => {
  const unit = useEditorUnit();
  return (
    <text className="cone-editor-total-readout" x={x} y={y} textAnchor="middle">
      total {fmtUnit(totalHeightMm, unit)}  ·  Ø {fmtUnit(maxDiameterMm, unit)}
    </text>
  );
};

export default TotalReadout;
