import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import ResultsDownload from "../components/results/ResultsDownload";

const goodResult = {
  run_id: "abc-123",
  fidelity_score: 0.85,
  constraint_failures: 0,
  download_url: "http://localhost:8000/download/abc-123",
  report_url: "http://localhost:8000/report/abc-123",
};

const lowFidelityResult = {
  ...goodResult,
  fidelity_score: 0.70,
};

const failuresResult = {
  ...goodResult,
  constraint_failures: 42,
};

describe("ResultsDownload", () => {
  it("renders null when result is undefined", () => {
    const { container } = render(<ResultsDownload result={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows run ID", () => {
    render(<ResultsDownload result={goodResult} />);
    expect(screen.getByText(/abc-123/)).toBeInTheDocument();
  });

  it("shows fidelity score as percentage", () => {
    render(<ResultsDownload result={goodResult} />);
    expect(screen.getByText("85.0%")).toBeInTheDocument();
  });

  it("shows below-threshold warning for low fidelity score", () => {
    render(<ResultsDownload result={lowFidelityResult} />);
    expect(screen.getByText(/below the 75% threshold/i)).toBeInTheDocument();
  });

  it("does not show warning for good fidelity", () => {
    render(<ResultsDownload result={goodResult} />);
    expect(screen.queryByText(/below the 75% threshold/i)).not.toBeInTheDocument();
  });

  it("shows constraint failures message when failures > 0", () => {
    render(<ResultsDownload result={failuresResult} />);
    expect(screen.getByText(/42 row\(s\) excluded/i)).toBeInTheDocument();
  });

  it("does not show constraint failures message when failures == 0", () => {
    render(<ResultsDownload result={goodResult} />);
    expect(screen.queryByText(/excluded/i)).not.toBeInTheDocument();
  });

  it("renders download and report links", () => {
    render(<ResultsDownload result={goodResult} />);
    expect(screen.getByText(/download dataset/i)).toBeInTheDocument();
    expect(screen.getByText(/audit report/i)).toBeInTheDocument();
  });

  it("calls onReplay with run_id when replay button clicked", async () => {
    const onReplay = vi.fn();
    render(<ResultsDownload result={goodResult} onReplay={onReplay} />);
    await userEvent.click(screen.getByText(/replay this run/i));
    expect(onReplay).toHaveBeenCalledWith("abc-123");
  });
});
