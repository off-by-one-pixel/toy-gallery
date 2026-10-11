import { describe, expect, it } from "vitest";
import type { EditorLayout } from "./hooks/useEditorLayout";
import {
  bandRect,
  bandStripeGeometry,
  diameterHandlePosition,
  diameterRowGeometry,
  guidesXRange,
  heightRowGeometry,
  mmToY,
  removeButtonPosition,
  rimButtonsGeometry,
  rimTickLine,
  rulerGeometry,
  sizeGuideGeometry,
  totalReadoutPosition,
} from "./geometry";
import { buildSectionMeta, RULER_WIDTH_PX } from "./layout";

const noop = () => {};

const makeLayout = (overrides: Partial<EditorLayout> = {}): EditorLayout => {
  const sections = [
    { id: 0, diameter: 100, height: 50 },
    { id: 1, diameter: 80, height: 30 },
  ];
  const sectionMeta = buildSectionMeta(sections);
  return {
    size: { w: 800, h: 600 },
    silhouetteScale: 2,
    silhouetteX: 300,
    silhouetteY: 50,
    silhouetteW: 200,
    silhouetteH: 160,
    silhouetteCenter: 400,
    totalHeightMm: 80,
    maxDiameterMm: 100,
    sectionMeta,
    ready: true,
    freezeFrame: noop,
    unfreezeFrame: noop,
    heightLabelX: 30,
    diameterLabelX: 540,
    ...overrides,
  };
};

describe("heightRowGeometry", () => {
  it("anchors yMid at the section's vertical midpoint in pixels", () => {
    const layout = makeLayout();
    const meta = layout.sectionMeta[0];
    const { yMid } = heightRowGeometry(meta, layout, 30);
    expect(yMid).toBe(100);
  });

  it("emits a bracket leader path with the input lead-out and section edges", () => {
    const layout = makeLayout();
    const meta = layout.sectionMeta[0];
    const { leaderD } = heightRowGeometry(meta, layout, 30);
    expect(leaderD).toContain("M 400 50");
    expect(leaderD).toContain("L 300 150");
  });
});

describe("diameterRowGeometry", () => {
  it("places the leader at the section's bottom-right edge", () => {
    const layout = makeLayout();
    const meta = layout.sectionMeta[0];
    const { leaderD } = diameterRowGeometry(meta, layout, 540);
    expect(leaderD).toContain("L 500 150");
  });

  it("anchors the last section's input below the silhouette via sectionInputY", () => {
    const layout = makeLayout();
    const last = layout.sectionMeta[1];
    const { inputY } = diameterRowGeometry(last, layout, 540);
    expect(inputY).toBeGreaterThan(mmToY(last.bottomMm, layout));
  });
});

describe("rimButtonsGeometry", () => {
  it("centers cx on the silhouette and insets top/bot by the button radius", () => {
    const layout = makeLayout();
    const meta = layout.sectionMeta[1];
    const { top, bot } = rimButtonsGeometry(meta, layout);
    expect(top.cx).toBe(layout.silhouetteCenter);
    expect(bot.cx).toBe(layout.silhouetteCenter);
    expect(top.cy).toBe(150 + 13);
    expect(bot.cy).toBe(210 - 13);
  });

  it("clamps the inset so buttons never overlap on tiny sections", () => {
    const layout = makeLayout();
    const tinyMeta = { ...layout.sectionMeta[0], topMm: 0, bottomMm: 4 };
    const { top, bot } = rimButtonsGeometry(tinyMeta, layout);
    expect(top.cy).toBe(50 + 3);
    expect(bot.cy).toBe(58 - 3);
  });
});

describe("rimTickLine", () => {
  it.each([
    ["0° points the tick straight down", 0, 100, 107],
    ["90° points horizontally outward (left at left anchor)", 90, 93, 100],
    ["180° points straight up", 180, 100, 93],
  ] as const)("%s, anchored at the button center", (_, angle, x2, y2) => {
    const line = rimTickLine(100, 100, angle);
    expect(line.x1).toBe(100);
    expect(line.y1).toBe(100);
    expect(line.x2).toBeCloseTo(x2, 6);
    expect(line.y2).toBeCloseTo(y2, 6);
  });
});

describe("guidesXRange", () => {
  it("clamps left edge to the ruler reservation, right edge to size", () => {
    const layout = makeLayout({ size: { w: 800, h: 600 } });
    const { xLeft, xRight } = guidesXRange(layout);
    expect(xLeft).toBe(Math.max(8, RULER_WIDTH_PX - 60));
    expect(xRight).toBe(792);
  });
});

describe("mmToY", () => {
  it("converts mm to px relative to the silhouette top", () => {
    const layout = makeLayout();
    expect(mmToY(40, layout)).toBe(50 + 40 * 2);
  });

  it("returns silhouetteY for 0 mm", () => {
    const layout = makeLayout();
    expect(mmToY(0, layout)).toBe(layout.silhouetteY);
  });
});

describe("sizeGuideGeometry", () => {
  it("returns vertical guide rails at center ± d/2 with overshoot above & below", () => {
    const layout = makeLayout();
    const g = sizeGuideGeometry(60, layout);
    expect(g.xLeft).toBe(340);
    expect(g.xRight).toBe(460);
    expect(g.yTop).toBe(layout.silhouetteY - 8);
    expect(g.yBot).toBe(layout.silhouetteY + layout.silhouetteH + 12);
  });
});

describe("bandStripeGeometry / bandRect", () => {
  it("overhangs the silhouette by 8px on each side", () => {
    const layout = makeLayout();
    const stripe = bandStripeGeometry(layout);
    expect(stripe.x).toBe(layout.silhouetteX - 8);
    expect(stripe.width).toBe(layout.silhouetteW + 16);
    expect(stripe.halfHeight).toBe(4);
  });

  it("bandRect centers a 8px-tall band on the given mm boundary", () => {
    const layout = makeLayout();
    const rect = bandRect(50, layout);
    expect(rect.y).toBe(mmToY(50, layout) - 4);
    expect(rect.height).toBe(8);
    expect(rect.rx).toBe(4);
  });
});

describe("diameterHandlePosition", () => {
  it("places the handle at the section's bottom-right corner", () => {
    const layout = makeLayout();
    const meta = layout.sectionMeta[0];
    const { cx, cy } = diameterHandlePosition(meta, layout);
    expect(cx).toBe(500);
    expect(cy).toBe(mmToY(meta.bottomMm, layout));
  });
});

describe("removeButtonPosition", () => {
  it("anchors a non-last section at its midpoint", () => {
    const layout = makeLayout();
    const first = layout.sectionMeta[0];
    const { cy } = removeButtonPosition(first, layout, false);
    expect(cy).toBe(mmToY(first.midMm, layout));
  });

  it("offsets the last section's button below the silhouette", () => {
    const layout = makeLayout();
    const last = layout.sectionMeta[1];
    const { cy } = removeButtonPosition(last, layout, false);
    expect(cy).toBeGreaterThan(mmToY(last.bottomMm, layout));
  });

  it("shifts cx right when section circumferences are shown", () => {
    const layout = makeLayout();
    const meta = layout.sectionMeta[0];
    const without = removeButtonPosition(meta, layout, false).cx;
    const withC = removeButtonPosition(meta, layout, true).cx;
    expect(withC).toBeGreaterThan(without);
  });
});

describe("rulerGeometry", () => {
  it("axis spans the full silhouette height", () => {
    const layout = makeLayout();
    const g = rulerGeometry(layout);
    expect(g.axisY1).toBe(layout.silhouetteY);
    expect(g.axisY2).toBe(layout.silhouetteY + layout.silhouetteH);
  });
});

describe("totalReadoutPosition", () => {
  it("centers under the silhouette with an 18px offset", () => {
    const layout = makeLayout();
    const { x, y } = totalReadoutPosition(layout);
    expect(x).toBe(layout.silhouetteCenter);
    expect(y).toBe(layout.silhouetteY + layout.silhouetteH + 18);
  });
});
