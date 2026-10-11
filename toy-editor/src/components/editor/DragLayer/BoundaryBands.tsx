import { useEditorLayoutCtx } from '../EditorLayoutContext';
import { bandRect } from '../geometry';
import type { DragHandlers } from '../hooks/useDragHandlers';

const BoundaryBands = ({ handlers }: { handlers: DragHandlers }) => {
  const layout = useEditorLayoutCtx();
  return (
    <>
      {layout.sectionMeta.map((meta) => (
        <rect
          key={`b-${meta.section.id}`}
          className="toy-editor-handle-boundary"
          {...bandRect(meta.bottomMm, layout)}
          {...handlers.boundary(meta)}
        />
      ))}
    </>
  );
};

export default BoundaryBands;
