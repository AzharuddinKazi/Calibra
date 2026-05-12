import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import DivergenceTable from "../components/preview/DivergenceTable";

const columns = [
  {
    name: "amount",
    type: "continuous",
    js_divergence: 0.03,
    real: { stats: { mean: 245.3, stddev: 180.1, min: 0.5, max: 49800 } },
    synthetic: { stats: { mean: 242.1, stddev: 179.4, min: 0.5, max: 49800 } },
  },
  {
    name: "channel",
    type: "categorical",
    js_divergence: 0.18,
    real: { histogram: { bins: [], counts: [] }, kde: null, stats: null },
    synthetic: { histogram: { bins: [], counts: [] }, kde: null, stats: null },
  },
  {
    name: "is_fraud",
    type: "boolean",
    js_divergence: 0.08,
    real: { stats: null },
    synthetic: { stats: null },
  },
];

describe("DivergenceTable", () => {
  it("renders column names", () => {
    render(<DivergenceTable columns={columns} />);
    expect(screen.getByText("amount")).toBeInTheDocument();
    expect(screen.getByText("channel")).toBeInTheDocument();
    expect(screen.getByText("is_fraud")).toBeInTheDocument();
  });

  it("shows — for non-continuous columns in mean columns", () => {
    render(<DivergenceTable columns={columns} />);
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("sorts by JS divergence on header click — toggles direction", () => {
    render(<DivergenceTable columns={columns} />);
    const header = screen.getByText("JS Divergence");
    const rows = () => screen.getAllByRole("row").slice(1);

    const firstBefore = rows()[0].textContent;
    fireEvent.click(header);
    const firstAfter = rows()[0].textContent;
    expect(firstBefore).not.toBe(firstAfter);
  });

  it("shows correct color class for divergence above 0.15 (red)", () => {
    const { container } = render(<DivergenceTable columns={columns} />);
    const redBars = container.querySelectorAll(".bg-red-500");
    expect(redBars.length).toBeGreaterThan(0);
  });

  it("shows correct color class for divergence below 0.05 (emerald)", () => {
    const { container } = render(<DivergenceTable columns={columns} />);
    const emeraldBars = container.querySelectorAll(".bg-emerald-500");
    expect(emeraldBars.length).toBeGreaterThan(0);
  });

  it("shows correct color class for divergence 0.05-0.15 (amber)", () => {
    const { container } = render(<DivergenceTable columns={columns} />);
    const amberBars = container.querySelectorAll(".bg-amber-500");
    expect(amberBars.length).toBeGreaterThan(0);
  });

  it("handles empty columns array gracefully", () => {
    render(<DivergenceTable columns={[]} />);
    expect(screen.getByText(/no column data/i)).toBeInTheDocument();
  });
});
