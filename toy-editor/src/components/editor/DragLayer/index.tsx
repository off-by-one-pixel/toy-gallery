import type { DragHandlers } from "../hooks/useDragHandlers";
import BottomBand from "./BottomBand";
import BoundaryBands from "./BoundaryBands";
import DiameterHandles from "./DiameterHandles";
import RemoveButtons from "./RemoveButtons";

const DragLayer = ({ handlers }: { handlers: DragHandlers }) => (
  <>
    {/* Bands first so the smaller diameter handles draw on top and win
        hit-testing where they overlap. */}
    <BoundaryBands handlers={handlers} />
    <BottomBand handlers={handlers} />
    <DiameterHandles handlers={handlers} />
    <RemoveButtons />
  </>
);

export default DragLayer;
