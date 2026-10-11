import type { DragHandlers } from '../hooks/useDragHandlers';
import BoundaryBands from './BoundaryBands';
import DiameterHandles from './DiameterHandles';
import RemoveButtons from './RemoveButtons';

const DragLayer = ({ handlers }: { handlers: DragHandlers }) => (
  <>
    <BoundaryBands handlers={handlers} />
    <DiameterHandles handlers={handlers} />
    <RemoveButtons />
  </>
);

export default DragLayer;
