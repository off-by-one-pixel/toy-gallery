import { describe, expect, it } from "vitest";
import { Shape, type ToySection } from "../toyMachine";
import {
  capPath,
  capSectionGeometry,
  sectionBodyGeometry,
} from "./silhouetteGeometry";

const baseSection: ToySection = { id: 0, diameter: 100, height: 50 };

// Strip path commands but preserve scientific notation (e.g. 1.5e-15).
const parseNumbers = (d: string): number[] =>
  d
    .replace(/[MCLZ]/gi, " ")
    .split(/[\s,]+/)
    .filter((s) => s.length > 0)
    .map(Number);

const expectClose = (actual: number, expected: number) => {
  expect(actual).toBeCloseTo(expected, 6);
};

// ─── Body section ──────────────────────────────────────────────────────

describe("sectionBodyGeometry", () => {
  it("centers the section in the available width", () => {
    const { x } = sectionBodyGeometry(baseSection, 1, 100, 200);
    expect(x).toBe(50); // (200 - 100) / 2
  });

  it("default presets reproduce the legacy h/2 vertical CPs", () => {
    const { d } = sectionBodyGeometry({ ...baseSection, diameter: 100 }, 1, 100, 100);
    const nums = parseNumbers(d);
    // Equal previous & current diameter → diff_prev = diff = 0.
    // Default θ_top=0 → top CPs at (xAnchor, h/2=25).
    // Default θ_bot=180 → bottom CPs at (xAnchor, h - h/2=25).
    const expected = [
      0, 0,
      0, 25, 0, 25, 0, 50,
      100, 50,
      100, 25, 100, 25, 100, 0,
    ];
    expect(nums).toHaveLength(expected.length);
    expected.forEach((v, i) => expectClose(nums[i], v));
  });

  it("topPreset=180 lifts the top CPs above the rim", () => {
    const { d } = sectionBodyGeometry(
      { ...baseSection, topPreset: 180 },
      1,
      100,
      100,
    );
    const nums = parseNumbers(d);
    expectClose(nums[3], -25);
    expectClose(nums[13], -25);
  });

  it("topPreset=90 places top CPs horizontally outward at y=0", () => {
    const { d } = sectionBodyGeometry(
      { ...baseSection, topPreset: 90 },
      1,
      100,
      100,
    );
    const nums = parseNumbers(d);
    expectClose(nums[2], -25); // top-left CP x
    expectClose(nums[3], 0); // top-left CP y
    expectClose(nums[12], 125); // top-right CP x
    expectClose(nums[13], 0); // top-right CP y
  });

  it("bottomPreset=0 pushes bottom CPs below the rim", () => {
    const { d } = sectionBodyGeometry(
      { ...baseSection, bottomPreset: 0 },
      1,
      100,
      100,
    );
    const nums = parseNumbers(d);
    expectClose(nums[5], 75);
    expectClose(nums[11], 75);
  });

  it("centers the smaller end against the wider end via diff/diffPrev", () => {
    // Section with diameter=80, prev=100 → diff_prev=0, diff=10.
    const { d } = sectionBodyGeometry(
      { ...baseSection, diameter: 80 },
      1,
      100,
      100,
    );
    const nums = parseNumbers(d);
    // Top-left anchor at x=0, bottom-left at x=10, top-right at x=100, bottom-right at x=90.
    expect(nums[0]).toBe(0); // top-left x
    expect(nums[6]).toBe(10); // bottom-left x
    expect(nums[8]).toBe(90); // bottom-right x (after L)
    expect(nums[14]).toBe(100); // top-right x
  });
});

// ─── Cap shapes ────────────────────────────────────────────────────────

describe("capPath", () => {
  it("FLAT renders a closed rectangle", () => {
    const d = capPath(Shape.FLAT, "top", 100, 50, false);
    expect(d).toBe("M 0 50 L 100 50 L 100 0 L 0 0 Z");
  });

  it("EGG places both CPs at the rim x-coordinates with cpY past the apex", () => {
    const d = capPath(Shape.EGG, "top", 100, 50, false);
    // baseY=50, apexY=0 → cpY = lerp(50, 0, 4/3) = -50/3 ≈ -16.67.
    // Path: M 0 50 C 0 -16.67 100 -16.67 100 50 Z
    const nums = parseNumbers(d);
    expectClose(nums[0], 0);
    expectClose(nums[1], 50);
    expectClose(nums[2], 0); // CP1 x
    expectClose(nums[3], -50 / 3); // CP1 y
    expectClose(nums[4], 100); // CP2 x
    expectClose(nums[5], -50 / 3); // CP2 y
  });

  it("CONE collapses both CPs to the centerline", () => {
    const d = capPath(Shape.CONE, "top", 100, 50, false);
    const nums = parseNumbers(d);
    expectClose(nums[2], 50); // CP1 x = r
    expectClose(nums[4], 50); // CP2 x = r (same)
    expectClose(nums[3], -50 / 3);
    expectClose(nums[5], -50 / 3);
  });

  it("SPIKE emits two cubics meeting at the apex", () => {
    const d = capPath(Shape.SPIKE, "top", 100, 50, false);
    // Two `C` segments. Splitting by `C` should yield 3 chunks (M, C1, C2 [+ Z]).
    const cubicCount = (d.match(/C/g) ?? []).length;
    expect(cubicCount).toBe(2);
  });

  it("orientation=bottom flips baseY/apexY", () => {
    const top = capPath(Shape.EGG, "top", 100, 50, false);
    const bottom = capPath(Shape.EGG, "bottom", 100, 50, false);
    // Top cap: baseY=50, apexY=0 → CPs at y = -50/3.
    // Bottom cap: baseY=0, apexY=50 → CPs at y = 50 + 50/3 = 200/3.
    const topNums = parseNumbers(top);
    const botNums = parseNumbers(bottom);
    expectClose(topNums[3], -50 / 3);
    expectClose(botNums[3], 200 / 3);
  });

  it("openBase strips the closing Z when adjacent body edge will be stroked", () => {
    const closed = capPath(Shape.EGG, "bottom", 100, 50, false);
    const open = capPath(Shape.EGG, "bottom", 100, 50, true);
    expect(closed.trim().endsWith("Z")).toBe(true);
    expect(open.trim().endsWith("Z")).toBe(false);
  });

  it("FLAT ignores openBase (always closes its own rectangle)", () => {
    const open = capPath(Shape.FLAT, "bottom", 100, 50, true);
    expect(open.trim().endsWith("Z")).toBe(true);
  });
});

// ─── Cap section geometry wrapper ──────────────────────────────────────

describe("capSectionGeometry", () => {
  it("top cap uses the section's own diameter for cap width", () => {
    // diameter=100 in a 200-wide canvas → x = (200 - 100)/2 = 50.
    const g = capSectionGeometry(baseSection, Shape.CONE, "top", 1, 0, 200, false);
    expect(g.x).toBe(50);
  });

  it("bottom cap inherits width from the section above", () => {
    // previousDiameter=80 → x = (200 - 80)/2 = 60.
    const g = capSectionGeometry(
      baseSection,
      Shape.CONE,
      "bottom",
      1,
      80,
      200,
      false,
    );
    expect(g.x).toBe(60);
  });

  it("scales width and height by scaleFactor", () => {
    // diameter=100, height=50, scale=2 → cap is 200x100 inside a 400-wide canvas.
    const g = capSectionGeometry(baseSection, Shape.FLAT, "top", 2, 0, 400, false);
    expect(g.x).toBe(100); // (400 - 200) / 2
    // FLAT path: `M 0 100 L 200 100 L 200 0 L 0 0 Z`
    expect(g.d).toBe("M 0 100 L 200 100 L 200 0 L 0 0 Z");
  });
});
