import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import PrevalenceBar from "../components/preview/PrevalenceBar";

const prevalence = {
  target: { fraud: 0.02, non_fraud: 0.98 },
  actual: { fraud: 0.0198, non_fraud: 0.9802 },
};

describe("PrevalenceBar", () => {
  it("shows 'not available' when prevalence is null", () => {
    render(<PrevalenceBar prevalence={null} />);
    expect(screen.getByText(/not available/i)).toBeInTheDocument();
  });

  it("renders without crashing with valid prevalence data", () => {
    const { container } = render(<PrevalenceBar prevalence={prevalence} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("shows tolerance note", () => {
    render(<PrevalenceBar prevalence={prevalence} />);
    expect(screen.getByText(/tolerance/i)).toBeInTheDocument();
  });
});
