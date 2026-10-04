import { useRef } from "react";
import type { ReferenceImageState } from "./hooks/useReferenceImage";

const PictureIcon = ({ crossed }: { crossed: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="9.5" r="1.6" />
    <path d="M4 18l5-5 3 3 3-4 5 6" />
    {crossed && <path d="M3 3l18 18" />}
  </svg>
);

const ReferenceImageControls = ({ reference }: { reference: ReferenceImageState }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const loaded = reference.image !== null;
  const label = loaded ? "Remove reference image" : "Add reference image";

  return (
    <div className="toy-editor-reference-controls">
      <button
        type="button"
        className="toy-editor-btn toy-editor-icon-btn"
        aria-label={label}
        title={label}
        onClick={loaded ? reference.clear : () => inputRef.current?.click()}
      >
        <PictureIcon crossed={loaded} />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        aria-label="Reference image file"
        onChange={reference.onFileInputChange}
      />
    </div>
  );
};

export default ReferenceImageControls;
