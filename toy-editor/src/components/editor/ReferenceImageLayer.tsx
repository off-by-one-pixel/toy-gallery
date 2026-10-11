import { useEditorLayoutCtx } from './EditorLayoutContext';
import { useEditorLabels } from './labels';
import type { ReferenceImageHandlers } from './hooks/useReferenceImageDrag';
import { HANDLE_R_PX } from './layout';
import { type ReferenceImage, referenceRect } from './referenceImage';

type Props = {
  image: ReferenceImage;
  handlers: ReferenceImageHandlers;
};

export const ReferenceImageBackdrop = ({ image, handlers }: Props) => {
  const layout = useEditorLayoutCtx();
  const rect = referenceRect(image, layout);
  return (
    <>
      <image
        className="toy-editor-reference"
        href={image.url}
        preserveAspectRatio="none"
        {...rect}
        onPointerDown={handlers.onMovePointerDown}
        onPointerMove={handlers.onPointerMove}
        onPointerUp={handlers.onPointerUp}
        onPointerCancel={handlers.onPointerUp}
      />
      <rect className="toy-editor-reference-border" {...rect} />
    </>
  );
};

export const ReferenceImageResizeHandle = ({ image, handlers }: Props) => {
  const layout = useEditorLayoutCtx();
  const labels = useEditorLabels();
  const { x, y, width, height } = referenceRect(image, layout);
  return (
    <circle
      className="toy-editor-handle toy-editor-reference-handle"
      cx={x + width}
      cy={y + height}
      r={HANDLE_R_PX}
      aria-label={labels.resizeReferenceImage}
      onPointerDown={handlers.onResizePointerDown}
      onPointerMove={handlers.onPointerMove}
      onPointerUp={handlers.onPointerUp}
      onPointerCancel={handlers.onPointerUp}
    />
  );
};
