import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import FidelityScoreCard from "../components/preview/FidelityScoreCard";

const goodFidelity = { composite: 0.87, column_fidelity: 0.89, correlation_fidelity: 0.84 };
const badFidelity = { composite: 0.70, column_fidelity: 0.68, correlation_fidelity: 0.73 };

describe("FidelityScoreCard", () => {
  it("renders all three score labels", () => {
    render(<FidelityScoreCard fidelity={goodFidelity} />);
    expect(screen.getByText(/composite score/i)).toBeInTheDocument();
    expect(screen.getByText(/column fidelity/i)).toBeInTheDocument();
    expect(screen.getByText(/correlation fidelity/i)).toBeInTheDocument();
  });

  it("renders null without crashing when fidelity is undefined", () => {
    const { container } = render(<FidelityScoreCard fidelity={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it("displays composite score as percentage", () => {
    render(<FidelityScoreCard fidelity={goodFidelity} />);
    expect(screen.getByText("87.0%")).toBeInTheDocument();
  });

  it("shows 'Below threshold' badges for below-threshold scores", () => {
    render(<FidelityScoreCard fidelity={badFidelity} />);
    const badges = screen.getAllByText(/below threshold/i);
    expect(badges.length).toBeGreaterThan(0);
  });

  it("shows 'Good' badges for high scores", () => {
    render(<FidelityScoreCard fidelity={goodFidelity} />);
    const badges = screen.getAllByText(/good/i);
    expect(badges.length).toBeGreaterThan(0);
  });
});
