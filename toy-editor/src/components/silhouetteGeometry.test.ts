import { describe, expect, it } from "vitest";
import { Shape, type ToySection } from "../toyMachine";
import { capPath, capSectionGeometry, sectionBodyGeometry } from "./silhouetteGeometry";

const baseSection: ToySection = { id: 0, diameter: 100, height: 50 };

const parseNumbers = (d: string): number[] =>
  d
    .replace(/[MCLZ]/gi, " ")
    .split(/[\s,]+/)
    .filter((s) => s.length > 0)
    .map(Number);

const expectClose = (actual: number, expected: number) => {
  expect(actual).toBeCloseTo(expected, 6);
};

describe("sectionBodyGeometry", () => {
  it("centers the section in the available width", () => {
    const { x } = sectionBodyGeometry(baseSection, 1, 100, 200);
    expect(x).toBe(50);
  });

  it("default angles reproduce the legacy h/2 vertical CPs", () => {
    const { d } = sectionBodyGeometry({ ...baseSection, diameter: 100 }, 1, 100, 100);
    const nums = parseNumbers(d);
    const expected = [0, 0, 0, 25, 0, 25, 0, 50, 100, 50, 100, 25, 100, 25, 100, 0];
    expect(nums).toHaveLength(expected.length);
    expected.forEach((v, i) => expectClose(nums[i], v));
  });

  it("topCurveAngle=180 lifts the top CPs above the rim", () => {
    const { d } = sectionBodyGeometry({ ...baseSection, topCurveAngle: 180 }, 1, 100, 100);
    const nums = parseNumbers(d);
    expectClose(nums[3], -25);
    expectClose(nums[13], -25);
  });

  it("topCurveAngle=90 places top CPs horizontally outward at y=0", () => {
    const { d } = sectionBodyGeometry({ ...baseSection, topCurveAngle: 90 }, 1, 100, 100);
    const nums = parseNumbers(d);
    expectClose(nums[2], -25);
    expectClose(nums[3], 0);
    expectClose(nums[12], 125);
    expectClose(nums[13], 0);
  });

  it("bottomCurveAngle=0 pushes bottom CPs below the rim", () => {
    const { d } = sectionBodyGeometry({ ...baseSection, bottomCurveAngle: 0 }, 1, 100, 100);
    const nums = parseNumbers(d);
    expectClose(nums[5], 75);
    expectClose(nums[11], 75);
  });

  it("centers the smaller end against the wider end via diff/diffPrev", () => {
    const { d } = sectionBodyGeometry({ ...baseSection, diameter: 80 }, 1, 100, 100);
    const nums = parseNumbers(d);
    expect(nums[0]).toBe(0);
    expect(nums[6]).toBe(10);
    expect(nums[8]).toBe(90);
    expect(nums[14]).toBe(100);
  });
});

describe("capPath", () => {
  it("FLAT renders a closed rectangle", () => {
    const d = capPath(Shape.FLAT, "top", 100, 50, false);
    expect(d).toBe("M 0 50 L 100 50 L 100 0 L 0 0 Z");
  });

  it("EGG places both CPs at the rim x-coordinates with cpY past the apex", () => {
    const d = capPath(Shape.EGG, "top", 100, 50, false);
    const nums = parseNumbers(d);
    expectClose(nums[0], 0);
    expectClose(nums[1], 50);
    expectClose(nums[2], 0);
    expectClose(nums[3], -50 / 3);
    expectClose(nums[4], 100);
    expectClose(nums[5], -50 / 3);
  });

  it("CONE collapses both CPs to the centerline", () => {
    const d = capPath(Shape.CONE, "top", 100, 50, false);
    const nums = parseNumbers(d);
    expectClose(nums[2], 50);
    expectClose(nums[4], 50);
    expectClose(nums[3], -50 / 3);
    expectClose(nums[5], -50 / 3);
  });

  it("SPIKE emits two cubics meeting at the apex", () => {
    const d = capPath(Shape.SPIKE, "top", 100, 50, false);
    const cubicCount = (d.match(/C/g) ?? []).length;
    expect(cubicCount).toBe(2);
  });

  it("orientation=bottom flips baseY/apexY", () => {
    const top = capPath(Shape.EGG, "top", 100, 50, false);
    const bottom = capPath(Shape.EGG, "bottom", 100, 50, false);
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

describe("capSectionGeometry", () => {
  it("top cap uses the section's own diameter for cap width", () => {
    const g = capSectionGeometry(baseSection, Shape.CONE, "top", 1, 0, 200, false);
    expect(g.x).toBe(50);
  });

  it("bottom cap inherits width from the section above", () => {
    const g = capSectionGeometry(baseSection, Shape.CONE, "bottom", 1, 80, 200, false);
    expect(g.x).toBe(60);
  });

  it("scales width and height by scaleFactor", () => {
    const g = capSectionGeometry(baseSection, Shape.FLAT, "top", 2, 0, 400, false);
    expect(g.x).toBe(100);
    expect(g.d).toBe("M 0 100 L 200 100 L 200 0 L 0 0 Z");
  });
});
