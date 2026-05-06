import { useEditorLayoutCtx } from "../EditorLayoutContext";
import { bandRect } from "../geometry";
import type { DragHandlers } from "../hooks/useDragHandlers";

const BoundaryBands = ({ handlers }: { handlers: DragHandlers }) => {
  const layout = useEditorLayoutCtx();
  return (
    <>
      {layout.sectionMeta.slice(0, -1).map((meta) => {
        const boundaryMm = meta.bottomMm;
        return (
          <rect
            key={`b-${meta.section.id}`}
            className="cone-editor-handle-boundary"
            {...bandRect(boundaryMm, layout)}
            onPointerDown={(e) =>
              handlers.onBoundaryPointerDown(e, meta.section.id, boundaryMm)
            }
            onPointerMove={handlers.onBoundaryPointerMove}
            onPointerUp={handlers.onPointerUp}
            onPointerCancel={handlers.onPointerUp}
          />
        );
      })}
    </>
  );
};

export default BoundaryBands;
