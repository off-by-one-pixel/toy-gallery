import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ToyEditor from "./ToyEditor";

describe("ToyEditor", () => {
  it("renders the canvas, cap-shape selectors, and known-measurements row", () => {
    render(<ToyEditor unit={{ id: "mm", factor: 1, decimals: 0 }} />);

    expect(screen.getByRole("combobox", { name: /top shape/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /bottom shape/i })).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /add section/i })).toBeInTheDocument();

    expect(screen.getByRole("textbox", { name: /insertable/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /total/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /snap/i })).toBeInTheDocument();

    expect(document.querySelector(".toy-editor-svg")).toBeTruthy();
  });
});
