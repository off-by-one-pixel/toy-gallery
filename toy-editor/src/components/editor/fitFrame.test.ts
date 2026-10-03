import { describe, expect, it } from "vitest";
import { fitFrame } from "./fitFrame";
import { LABEL_WIDTH_PX, RULER_WIDTH_PX, VPAD_BOTTOM_PX, VPAD_TOP_PX } from "./layout";
import type { ReferenceImage } from "./referenceImage";

const size = { w: RULER_WIDTH_PX + LABEL_WIDTH_PX + 400, h: VPAD_TOP_PX + VPAD_BOTTOM_PX + 400 };

const image = (overrides: Partial<ReferenceImage> = {}): ReferenceImage => ({
  url: "blob:test",
  aspect: 1,
  xMm: -50,
  yMm: 0,
  widthMm: 100,
  ...overrides,
});

describe("fitFrame", () => {
  it("fits the toy into the padded area when there is no image", () => {
    expect(fitFrame(size, 200, 100, null)).toEqual({ scale: 2, silhouetteY: VPAD_TOP_PX });
  });

  it("leaves the toy fit alone while a wider image still fits within the canvas edges", () => {
    const wide = image({ xMm: -150, widthMm: 300, aspect: 0.5 });
    expect(fitFrame(size, 200, 100, wide)).toEqual({ scale: 2, silhouetteY: VPAD_TOP_PX });
  });

  it("shrinks only as far as needed for the image to touch the side edge", () => {
    const wide = image({ xMm: -300, widthMm: 600, aspect: 0.1 });
    expect(fitFrame(size, 200, 100, wide).scale).toBeCloseTo(size.w / 2 / 300);
  });

  it("uses the top padding before shifting the toy down for an image above it", () => {
    const scale = 2;
    const above = image({ yMm: -VPAD_TOP_PX / scale, widthMm: 10 });
    expect(fitFrame(size, 200, 100, above)).toEqual({ scale, silhouetteY: VPAD_TOP_PX });
  });

  it("lets the image span the full canvas height", () => {
    const tall = image({ xMm: -5, widthMm: 10, aspect: 30, yMm: -50 });
    const frame = fitFrame(size, 200, 100, tall);
    expect(frame.scale).toBeCloseTo(size.h / 300);
    expect(frame.silhouetteY).toBeCloseTo(50 * frame.scale);
  });
});
