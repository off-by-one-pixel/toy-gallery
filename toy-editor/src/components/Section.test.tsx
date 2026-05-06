import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ToySection } from "../toyMachine";
import Section from "./Section";

const baseStyle = { borderWidth: 2, borderColor: "#000", color: "lightblue" };
const baseSection: ToySection = { id: 0, diameter: 100, height: 50 };

const renderSection = (section: ToySection, prev = 100) => {
  const { container } = render(
    <svg>
      <Section
        section={section}
        scaleFactor={1}
        previousDiameter={prev}
        totalWidth={100}
        style={baseStyle}
      />
    </svg>,
  );
  const path = container.querySelector("path");
  return path?.getAttribute("d") ?? "";
};

// Strip only the SVG path commands we emit, not the `e` inside scientific
// notation (Number("…e-15") would otherwise be split into two tokens).
const parseNumbers = (d: string): number[] =>
  d
    .replace(/[MCLZ]/gi, " ")
    .split(/[\s,]+/)
    .filter((s) => s.length > 0)
    .map(Number);

const expectClose = (actual: number, expected: number) => {
  expect(actual).toBeCloseTo(expected, 6);
};

describe("Section path with rim presets", () => {
  it("default presets reproduce the legacy h/2 vertical CPs", () => {
    // Equal previous & current diameter so diff_prev = diff = 0.
    const d = renderSection({ ...baseSection, diameter: 100 }, 100);
    const nums = parseNumbers(d);
    // Path layout: M xTL 0  C cpTopL_x cpTopL_y cpBotL_x cpBotL_y xBL h
    //              L xBR h  C cpBotR_x cpBotR_y cpTopR_x cpTopR_y xTR 0
    // With diameters equal: xTL=0, xTR=100, xBL=0, xBR=100, h=50.
    // Default θ_top=0 → top CPs at (xAnchor, h/2=25).
    // Default θ_bot=180 → bottom CPs at (xAnchor, h - h/2=25).
    const expected = [
      0, 0, // M
      0, 25, 0, 25, 0, 50, // left-side cubic
      100, 50, // L
      100, 25, 100, 25, 100, 0, // right-side cubic
    ];
    expect(nums).toHaveLength(expected.length);
    expected.forEach((v, i) => expectClose(nums[i], v));
  });

  it("topPreset=180 lifts the top CPs above the rim", () => {
    const d = renderSection({ ...baseSection, topPreset: 180 }, 100);
    const nums = parseNumbers(d);
    // θ_top=180: sin=0, cos=-1 → top CPs at (xAnchor, -h/2=-25).
    expectClose(nums[3], -25); // cpTopL_y
    expectClose(nums[13], -25); // cpTopR_y (right-side cubic, second CP's y)
  });

  it("topPreset=90 places top CPs horizontally outward at y=0", () => {
    const d = renderSection({ ...baseSection, topPreset: 90 }, 100);
    const nums = parseNumbers(d);
    // θ_top=90: sin=1, cos=0. Left top CP x = xTL - 1*m = 0 - 25 = -25, y=0.
    // Right top CP x = xTR + 25 = 100 + 25 = 125, y=0.
    expectClose(nums[2], -25); // cpTopL_x (less than xTL=0)
    expectClose(nums[3], 0); // cpTopL_y
    expectClose(nums[12], 125); // cpTopR_x (greater than xTR=100)
    expectClose(nums[13], 0); // cpTopR_y
  });

  it("bottomPreset=0 pushes bottom CPs below the rim", () => {
    const d = renderSection({ ...baseSection, bottomPreset: 0 }, 100);
    const nums = parseNumbers(d);
    // θ_bot=0: sin=0, cos=1 → bottom CPs at (xAnchor, h + m) = (xAnchor, 75).
    expectClose(nums[5], 75); // cpBotL_y (left-side cubic, second CP)
    expectClose(nums[11], 75); // cpBotR_y (right-side cubic, first CP)
  });
});
