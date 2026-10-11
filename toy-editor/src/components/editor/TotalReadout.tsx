import { fmtUnit } from '../../util/fmt';
import { useEditorUnit } from '../unit';
import { useEditorLayoutCtx } from './EditorLayoutContext';
import { useEditorLabels } from './labels';
import { totalReadoutPosition } from './geometry';

const TotalReadout = () => {
  const layout = useEditorLayoutCtx();
  const unit = useEditorUnit();
  const labels = useEditorLabels();
  return (
    <text className="toy-editor-total-readout" {...totalReadoutPosition(layout)} textAnchor="middle">
      {labels.totalReadout(fmtUnit(layout.totalHeightMm, unit))} · Ø {fmtUnit(layout.maxDiameterMm, unit)}
    </text>
  );
};

export default TotalReadout;
