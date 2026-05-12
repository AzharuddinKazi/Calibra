import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import GenerationPanel from "../components/generation/GenerationPanel";

describe("GenerationPanel", () => {
  it("renders row count input and generate button", () => {
    render(<GenerationPanel sessionId="sess-1" onGenerated={vi.fn()} />);
    expect(screen.getByLabelText(/number of rows/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generate/i })).toBeInTheDocument();
  });

  it("disables generate button when sessionId is missing", () => {
    render(<GenerationPanel sessionId={null} onGenerated={vi.fn()} />);
    expect(screen.getByRole("button", { name: /generate/i })).toBeDisabled();
  });

  it("shows row count input with default value of 10000", () => {
    render(<GenerationPanel sessionId="sess-1" onGenerated={vi.fn()} />);
    const input = screen.getByLabelText(/number of rows/i);
    expect(input.value).toBe("10000");
  });

  it("enables generate button when sessionId is provided", () => {
    render(<GenerationPanel sessionId="sess-1" onGenerated={vi.fn()} />);
    expect(screen.getByRole("button", { name: /generate/i })).not.toBeDisabled();
  });
});
