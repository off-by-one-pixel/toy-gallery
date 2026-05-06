import { useEditorLayoutCtx } from "../EditorLayoutContext";
import { bandRect } from "../geometry";
import type { DragHandlers } from "../hooks/useDragHandlers";

const BottomBand = ({ handlers }: { handlers: DragHandlers }) => {
  const layout = useEditorLayoutCtx();
  const last = layout.sectionMeta.at(-1);
  if (!last) return null;
  return (
    <rect
      className="cone-editor-handle-boundary cone-editor-handle-bottom"
      {...bandRect(last.bottomMm, layout)}
      onPointerDown={(e) =>
        handlers.onBottomPointerDown(e, last.section.id, last.bottomMm, last.topMm)
      }
      onPointerMove={handlers.onBottomPointerMove}
      onPointerUp={handlers.onPointerUp}
      onPointerCancel={handlers.onPointerUp}
    />
  );
};

export default BottomBand;
