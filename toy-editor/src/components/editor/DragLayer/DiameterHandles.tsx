import { Shape, useToyStore } from "../../../toyMachine";
import { useEditorLayoutCtx } from "../EditorLayoutContext";
import { diameterHandlePosition } from "../geometry";
import type { DragHandlers } from "../hooks/useDragHandlers";
import { HANDLE_R_PX } from "../layout";

const DiameterHandles = ({ handlers }: { handlers: DragHandlers }) => {
  const layout = useEditorLayoutCtx();
  const bottomShape = useToyStore((s) => s.bottomShape);
  const sectionsLen = layout.sectionMeta.length;

  return (
    <>
      {layout.sectionMeta.map((meta) => {
        // Bottom-shape caps inherit width from the section above, so they
        // get no diameter handle.
        if (meta.isLast && sectionsLen > 1 && bottomShape !== Shape.FLAT) {
          return null;
        }
        const pos = diameterHandlePosition(meta, layout);
        return (
          <circle
            key={`d-${meta.section.id}`}
            className="cone-editor-handle cone-editor-handle-diameter"
            {...pos}
            r={HANDLE_R_PX}
            onPointerDown={(e) =>
              handlers.onDiameterPointerDown(e, meta.section.id, pos.cx)
            }
            onPointerMove={handlers.onDiameterPointerMove}
            onPointerUp={handlers.onPointerUp}
            onPointerCancel={handlers.onPointerUp}
          />
        );
      })}
    </>
  );
};

export default DiameterHandles;
