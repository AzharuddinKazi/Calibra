import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import CorrelationHeatmap from "../components/preview/CorrelationHeatmap";

const correlation = {
  real: [[1.0, 0.42], [0.42, 1.0]],
  synthetic: [[1.0, 0.40], [0.40, 1.0]],
  column_names: ["amount", "hour"],
};

const largeCorrelation = {
  real: Array(11).fill(Array(11).fill(0.5)),
  synthetic: Array(11).fill(Array(11).fill(0.5)),
  column_names: Array(11).fill(0).map((_, i) => `col_${i}`),
};

describe("CorrelationHeatmap", () => {
  it("shows 'not available' when correlation is null", () => {
    render(<CorrelationHeatmap correlation={null} />);
    expect(screen.getByText(/not available/i)).toBeInTheDocument();
  });

  it("renders real and synthetic heatmap titles", () => {
    render(<CorrelationHeatmap correlation={correlation} />);
    expect(screen.getByText("Real Data")).toBeInTheDocument();
    expect(screen.getByText("Synthetic Data")).toBeInTheDocument();
  });

  it("shows top-10 note when more than 10 columns", () => {
    render(<CorrelationHeatmap correlation={largeCorrelation} />);
    expect(screen.getByText(/top 10/i)).toBeInTheDocument();
  });

  it("does not show top-10 note for small column sets", () => {
    render(<CorrelationHeatmap correlation={correlation} />);
    expect(screen.queryByText(/top 10/i)).not.toBeInTheDocument();
  });
});
