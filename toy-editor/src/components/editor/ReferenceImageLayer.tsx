import { useEditorLayoutCtx } from './EditorLayoutContext';
import { useEditorConfig } from '../editorConfig';
import type { ReferenceImageDrag } from './hooks/useReferenceImageDrag';
import { HANDLE_R_PX } from './layout';
import { type ReferenceImage, referenceRect } from './referenceImage';

type Props = {
  image: ReferenceImage;
  drag: ReferenceImageDrag;
};

export const ReferenceImageBackdrop = ({ image, drag }: Props) => {
  const layout = useEditorLayoutCtx();
  const rect = referenceRect(image, layout);
  return (
    <>
      <image
        className="toy-editor-reference"
        href={image.url}
        preserveAspectRatio="none"
        {...rect}
        {...drag(image, 'move')}
      />
      <rect className="toy-editor-reference-border" {...rect} />
    </>
  );
};

export const ReferenceImageResizeHandle = ({ image, drag }: Props) => {
  const layout = useEditorLayoutCtx();
  const { labels } = useEditorConfig();
  const { x, y, width, height } = referenceRect(image, layout);
  return (
    <circle
      className="toy-editor-handle toy-editor-reference-handle"
      cx={x + width}
      cy={y + height}
      r={HANDLE_R_PX}
      aria-label={labels.resizeReferenceImage}
      {...drag(image, 'resize')}
    />
  );
};
