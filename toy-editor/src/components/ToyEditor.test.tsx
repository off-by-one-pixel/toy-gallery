import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ToyEditor from "./ToyEditor";

describe("ToyEditor", () => {
  it("renders the canvas, cap-shape selectors, and known-measurements row", () => {
    render(<ToyEditor unit={{ id: "mm", factor: 1, decimals: 0 }} />);

    // Cap shape selectors at top and bottom of the silhouette
    expect(screen.getByRole("combobox", { name: /top shape/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /bottom shape/i })).toBeInTheDocument();

    // Add section button below the silhouette
    expect(screen.getByRole("button", { name: /add section/i })).toBeInTheDocument();

    // Known measurements row
    expect(screen.getByRole("spinbutton", { name: /insertable/i })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: /total/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /snap/i })).toBeInTheDocument();

    // The silhouette + chrome render inside <svg>, but the editor chrome
    // depends on a measured pixel size from ResizeObserver. happy-dom
    // returns 0×0 boxes by default so handles only appear after layout in
    // a real browser. Just verify the SVG element exists.
    expect(document.querySelector(".cone-editor-svg")).toBeTruthy();
  });
});
