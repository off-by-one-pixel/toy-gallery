import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ToyEditor from "./ToyEditor";

describe("ToyEditor", () => {
  it("renders the controls and canvas", () => {
    render(<ToyEditor unit={{ id: "mm", factor: 1, decimals: 0 }} />);
    expect(screen.getByRole("button", { name: /add section/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /top shape/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /bottom shape/i })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: /diameter/i })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: /height/i })).toBeInTheDocument();
  });
});
