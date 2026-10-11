import type { DragHandlers } from '../hooks/useDragHandlers';
import BottomBand from './BottomBand';
import BoundaryBands from './BoundaryBands';
import DiameterHandles from './DiameterHandles';
import RemoveButtons from './RemoveButtons';

const DragLayer = ({ handlers }: { handlers: DragHandlers }) => (
  <>
    <BoundaryBands handlers={handlers} />
    <BottomBand handlers={handlers} />
    <DiameterHandles handlers={handlers} />
    <RemoveButtons />
  </>
);

export default DragLayer;
