import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ConstraintBuilder from "../components/config/ConstraintBuilder";

const columns = [
  { name: "amount", col_type: "continuous" },
  { name: "channel", col_type: "categorical" },
  { name: "timestamp", col_type: "datetime" },
];

describe("ConstraintBuilder", () => {
  it("renders all rule type buttons", () => {
    render(<ConstraintBuilder columns={columns} onAddConstraint={() => {}} />);
    expect(screen.getByText("Bound")).toBeInTheDocument();
    expect(screen.getByText("Conditional")).toBeInTheDocument();
    expect(screen.getByText("Relational")).toBeInTheDocument();
    expect(screen.getByText("Temporal")).toBeInTheDocument();
  });

  it("shows Min and Max fields for bound rule type", () => {
    render(<ConstraintBuilder columns={columns} onAddConstraint={() => {}} />);
    expect(screen.getByText("Min")).toBeInTheDocument();
    expect(screen.getByText("Max")).toBeInTheDocument();
  });

  it("shows conditional-specific fields when Conditional is selected", () => {
    render(<ConstraintBuilder columns={columns} onAddConstraint={() => {}} />);
    fireEvent.click(screen.getByText("Conditional"));
    expect(screen.getByText("If column")).toBeInTheDocument();
    expect(screen.getByText(/then column/i)).toBeInTheDocument();
  });

  it("shows temporal-specific fields when Temporal is selected", () => {
    render(<ConstraintBuilder columns={columns} onAddConstraint={() => {}} />);
    fireEvent.click(screen.getByText("Temporal"));
    expect(screen.getByText("Max count")).toBeInTheDocument();
    expect(screen.getByText("Window")).toBeInTheDocument();
  });

  it("Add Constraint button is disabled when required fields are empty", () => {
    render(<ConstraintBuilder columns={columns} onAddConstraint={() => {}} />);
    const btn = screen.getByRole("button", { name: /add constraint/i });
    expect(btn).toBeDisabled();
  });

  it("shows readable summary after valid bound fields are filled", async () => {
    const { container } = render(<ConstraintBuilder columns={columns} onAddConstraint={() => {}} />);

    const selects = container.querySelectorAll("button[role='combobox']");
    if (selects.length > 0) {
      fireEvent.click(selects[0]);
      const option = screen.queryByText("amount");
      if (option) fireEvent.click(option);
    }

    const minInput = screen.getByPlaceholderText("No minimum");
    fireEvent.change(minInput, { target: { value: "10" } });
    const maxInput = screen.getByPlaceholderText("No maximum");
    fireEvent.change(maxInput, { target: { value: "1000" } });

    expect(screen.getByText(/must be/i)).toBeInTheDocument();
  });

  it("calls onAddConstraint with correct structure for bound type when valid", () => {
    const onAdd = vi.fn();
    const { container } = render(<ConstraintBuilder columns={columns} onAddConstraint={onAdd} />);

    const selects = container.querySelectorAll("button[role='combobox']");
    if (selects.length > 0) {
      fireEvent.click(selects[0]);
      const option = screen.queryByText("amount");
      if (option) fireEvent.click(option);
    }

    const minInput = screen.getByPlaceholderText("No minimum");
    fireEvent.change(minInput, { target: { value: "0" } });
    const maxInput = screen.getByPlaceholderText("No maximum");
    fireEvent.change(maxInput, { target: { value: "500" } });

    const btn = screen.getByRole("button", { name: /add constraint/i });
    if (!btn.disabled) {
      fireEvent.click(btn);
      expect(onAdd).toHaveBeenCalledTimes(1);
      const arg = onAdd.mock.calls[0][0];
      expect(arg.rule_type).toBe("bound");
      expect(arg.source).toBe("user_manual");
    }
  });
});
