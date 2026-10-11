import { fmtUnit } from '../../util/fmt';
import { useEditorConfig } from '../editorConfig';
import { useEditorLayoutCtx } from './EditorLayoutContext';
import { totalReadoutPosition } from './geometry';

const TotalReadout = () => {
  const layout = useEditorLayoutCtx();
  const { unit, labels } = useEditorConfig();
  return (
    <text className="toy-editor-total-readout" {...totalReadoutPosition(layout)} textAnchor="middle">
      {labels.totalReadout(fmtUnit(layout.totalHeightMm, unit))} · Ø {fmtUnit(layout.maxDiameterMm, unit)}
    </text>
  );
};

export default TotalReadout;
