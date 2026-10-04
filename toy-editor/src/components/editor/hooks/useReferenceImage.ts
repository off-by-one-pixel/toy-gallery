import {
  type ChangeEvent,
  type Dispatch,
  type DragEvent,
  type SetStateAction,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useToyStore } from "../../../toyMachine";
import { firstImageFile, placeReferenceImage, type ReferenceImage } from "../referenceImage";

export type ReferenceImageState = {
  image: ReferenceImage | null;
  setImage: Dispatch<SetStateAction<ReferenceImage | null>>;
  clear: () => void;
  onFileInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onDragOver: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
};

const toyHeightMm = () => useToyStore.getState().sections.reduce((a, s) => a + s.height, 0);

export const useReferenceImage = (): ReferenceImageState => {
  const [image, setImage] = useState<ReferenceImage | null>(null);
  const url = image?.url;

  const load = useCallback((file: File) => {
    const objectUrl = URL.createObjectURL(file);
    const probe = new Image();
    probe.onload = () =>
      setImage(
        placeReferenceImage(objectUrl, probe.naturalWidth, probe.naturalHeight, toyHeightMm()),
      );
    probe.onerror = () => URL.revokeObjectURL(objectUrl);
    probe.src = objectUrl;
  }, []);

  useEffect(() => {
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = firstImageFile(e.clipboardData?.files);
      if (!file) return;
      e.preventDefault();
      load(file);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [load]);

  const clear = useCallback(() => setImage(null), []);

  const onFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = firstImageFile(e.target.files);
      if (file) load(file);
      e.target.value = "";
    },
    [load],
  );

  const onDragOver = useCallback((e: DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) e.preventDefault();
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      if (!e.dataTransfer.types.includes("Files")) return;
      e.preventDefault();
      const file = firstImageFile(e.dataTransfer.files);
      if (file) load(file);
    },
    [load],
  );

  return { image, setImage, clear, onFileInputChange, onDragOver, onDrop };
};
