import type { EditorLayout } from "./hooks/useEditorLayout";

export type ReferenceImage = {
  url: string;
  aspect: number;
  xMm: number;
  yMm: number;
  widthMm: number;
};

export const MIN_REFERENCE_WIDTH_MM = 5;

export const referenceHeightMm = (image: ReferenceImage): number => image.widthMm * image.aspect;

export const placeReferenceImage = (
  url: string,
  naturalWidth: number,
  naturalHeight: number,
  toyHeightMm: number,
): ReferenceImage => {
  const aspect = naturalHeight / naturalWidth;
  const heightMm = toyHeightMm > 0 ? toyHeightMm : naturalHeight;
  const widthMm = heightMm / aspect;
  return { url, aspect, xMm: -widthMm / 2, yMm: 0, widthMm };
};

export const resizedWidthMm = (
  image: ReferenceImage,
  cornerXMm: number,
  cornerYMm: number,
): number =>
  Math.max(MIN_REFERENCE_WIDTH_MM, cornerXMm - image.xMm, (cornerYMm - image.yMm) / image.aspect);

export const referenceRect = (
  image: ReferenceImage,
  layout: EditorLayout,
): { x: number; y: number; width: number; height: number } => ({
  x: layout.silhouetteCenter + image.xMm * layout.silhouetteScale,
  y: layout.silhouetteY + image.yMm * layout.silhouetteScale,
  width: image.widthMm * layout.silhouetteScale,
  height: referenceHeightMm(image) * layout.silhouetteScale,
});

export const firstImageFile = (files: FileList | null | undefined): File | undefined =>
  Array.from(files ?? []).find((file) => file.type.startsWith("image/"));
