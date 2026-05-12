import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import SampleTable from "../components/preview/SampleTable";

const rows = [
  { amount: 120.5, channel: "online", is_fraud: 0 },
  { amount: 9999.0, channel: "branch", is_fraud: 1 },
  { amount: 45.0, channel: "atm", is_fraud: 0 },
];

describe("SampleTable", () => {
  it("renders column headers from row keys", () => {
    render(<SampleTable rows={rows} />);
    expect(screen.getByText("amount")).toBeInTheDocument();
    expect(screen.getByText("channel")).toBeInTheDocument();
    expect(screen.getByText("is_fraud")).toBeInTheDocument();
  });

  it("shows 'no sample data' when rows is empty", () => {
    render(<SampleTable rows={[]} />);
    expect(screen.getByText(/no sample data/i)).toBeInTheDocument();
  });

  it("shows 'no sample data' when rows is undefined", () => {
    render(<SampleTable rows={undefined} />);
    expect(screen.getByText(/no sample data/i)).toBeInTheDocument();
  });

  it("renders all data rows", () => {
    render(<SampleTable rows={rows} />);
    expect(screen.getByText("online")).toBeInTheDocument();
    expect(screen.getByText("branch")).toBeInTheDocument();
    expect(screen.getByText("atm")).toBeInTheDocument();
  });

  it("renders fraud label as badge", () => {
    render(<SampleTable rows={rows} />);
    const badges = screen.getAllByText("1");
    expect(badges.length).toBeGreaterThan(0);
  });
});
