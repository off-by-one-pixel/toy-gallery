import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Shape, type Toy } from "../../toyMachine";
import ThumbnailRender from "./ThumbnailRender";

const STYLE = { color: "#c7e4ee", borderColor: "#334", borderWidth: 1.25 };

const toy = (sections: Array<[number, number]>): Toy => ({
  sections: sections.map(([diameter, height], id) => ({ id, diameter, height })),
  topShape: Shape.EGG,
  bottomShape: Shape.FLAT,
});

const renderedSvg = (t: Toy, scaleFactor = 1) => {
  const { container } = render(<ThumbnailRender toy={t} scaleFactor={scaleFactor} style={STYLE} />);
  return container.querySelector("svg") as SVGSVGElement;
};

describe("ThumbnailRender", () => {
  it("sizes the viewBox exactly to the toy bounds so baselines align across thumbnails", () => {
    const svg = renderedSvg(toy([[40, 60], [50, 90], [45, 30]]));
    expect(svg.getAttribute("viewBox")).toBe("0 0 50 180");
  });

  it("applies the scale factor to the bounds", () => {
    const svg = renderedSvg(toy([[40, 100]]), 2);
    expect(svg.getAttribute("viewBox")).toBe("0 0 80 200");
  });

  it("anchors the drawing to the bottom of its container", () => {
    const svg = renderedSvg(toy([[40, 100]]));
    expect(svg.getAttribute("preserveAspectRatio")).toBe("xMidYMax meet");
  });

  it("keeps a valid viewBox for a toy without sections", () => {
    const svg = renderedSvg(toy([]));
    expect(svg.getAttribute("viewBox")).toBe("0 0 1 1");
  });

  it("lets the non-scaling stroke overhang render outside the bounds", () => {
    const svg = renderedSvg(toy([[40, 100]]));
    expect(svg.style.overflow).toBe("visible");
  });
});
