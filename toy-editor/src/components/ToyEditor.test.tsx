import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ToyEditor from "./ToyEditor";

describe("ToyEditor", () => {
  it("renders the controls and canvas", () => {
    render(<ToyEditor />);
    expect(screen.getByRole("button", { name: /add section/i })).toBeInTheDocument();
    expect(screen.getByText(/diameter/i)).toBeInTheDocument();
    expect(screen.getByText(/height/i)).toBeInTheDocument();
  });
});
