import { describe, expect, it } from "vitest";
import {
  firstImageFile,
  MIN_REFERENCE_WIDTH_MM,
  placeReferenceImage,
  referenceHeightMm,
  type ReferenceImage,
  referenceRect,
  resizedWidthMm,
} from "./referenceImage";
import type { EditorLayout } from "./hooks/useEditorLayout";

const image = (overrides: Partial<ReferenceImage> = {}): ReferenceImage => ({
  url: "blob:test",
  aspect: 2,
  xMm: -25,
  yMm: 0,
  widthMm: 50,
  ...overrides,
});

describe("placeReferenceImage", () => {
  it("scales the image to the toy height and centers it on the toy axis", () => {
    const placed = placeReferenceImage("blob:x", 400, 800, 120);
    expect(placed.aspect).toBe(2);
    expect(placed.widthMm).toBe(60);
    expect(referenceHeightMm(placed)).toBe(120);
    expect(placed.xMm).toBe(-30);
    expect(placed.yMm).toBe(0);
  });

  it("falls back to natural pixel size when the toy has no height", () => {
    const placed = placeReferenceImage("blob:x", 300, 150, 0);
    expect(placed.widthMm).toBe(300);
  });
});

describe("resizedWidthMm", () => {
  it("follows whichever axis the dragged corner pushes further", () => {
    expect(resizedWidthMm(image(), 45, 100)).toBe(70);
    expect(resizedWidthMm(image(), 25, 200)).toBe(100);
  });

  it("never shrinks below the minimum width", () => {
    expect(resizedWidthMm(image(), -100, -100)).toBe(MIN_REFERENCE_WIDTH_MM);
  });
});

describe("referenceRect", () => {
  it("maps mm placement into pixels around the silhouette axis", () => {
    const layout = { silhouetteCenter: 400, silhouetteY: 50, silhouetteScale: 2 } as EditorLayout;
    expect(referenceRect(image(), layout)).toEqual({ x: 350, y: 50, width: 100, height: 200 });
  });
});

describe("firstImageFile", () => {
  it("picks the first image and ignores other files", () => {
    const text = new File(["a"], "a.txt", { type: "text/plain" });
    const png = new File(["b"], "b.png", { type: "image/png" });
    const files = [text, png] as unknown as FileList;
    expect(firstImageFile(files)).toBe(png);
    expect(firstImageFile(null)).toBeUndefined();
  });
});
