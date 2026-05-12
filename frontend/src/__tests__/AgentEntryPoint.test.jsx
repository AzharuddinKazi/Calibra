import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import AgentEntryPoint from "../components/agent/AgentEntryPoint";

describe("AgentEntryPoint", () => {
  it("renders two entry card titles", () => {
    render(<AgentEntryPoint onSelectMode={vi.fn()} />);
    expect(screen.getByText(/ai agent/i)).toBeInTheDocument();
    expect(screen.getByText(/upload dataset/i)).toBeInTheDocument();
  });

  it("calls onSelectMode with agent_first and chat when first card clicked", async () => {
    const onSelectMode = vi.fn();
    render(<AgentEntryPoint onSelectMode={onSelectMode} />);
    await userEvent.click(screen.getByText(/ai agent/i).closest("button"));
    expect(onSelectMode).toHaveBeenCalledWith("agent_first", "chat");
  });

  it("calls onSelectMode with upload_first and upload when second card clicked", async () => {
    const onSelectMode = vi.fn();
    render(<AgentEntryPoint onSelectMode={onSelectMode} />);
    await userEvent.click(screen.getByText(/upload dataset/i).closest("button"));
    expect(onSelectMode).toHaveBeenCalledWith("upload_first", "upload");
  });
});
