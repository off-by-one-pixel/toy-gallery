import { fmtUnit } from "../../util/fmt";
import { useEditorUnit } from "../unit";
import { useEditorLayoutCtx } from "./EditorLayoutContext";
import { totalReadoutPosition } from "./geometry";

const TotalReadout = () => {
  const layout = useEditorLayoutCtx();
  const unit = useEditorUnit();
  return (
    <text
      className="cone-editor-total-readout"
      {...totalReadoutPosition(layout)}
      textAnchor="middle"
    >
      total {fmtUnit(layout.totalHeightMm, unit)}  ·  Ø {fmtUnit(layout.maxDiameterMm, unit)}
    </text>
  );
};

export default TotalReadout;
