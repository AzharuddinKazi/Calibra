import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import AgentEntryPoint from "../components/agent/AgentEntryPoint";

describe("AgentEntryPoint", () => {
  it("renders two entry card titles", () => {
    render(<AgentEntryPoint onSelectMode={vi.fn()} />);
    expect(screen.getByText(/describe what you need/i)).toBeInTheDocument();
    expect(screen.getByText(/upload your dataset/i)).toBeInTheDocument();
  });

  it("calls onSelectMode with agent_first and chat when first card clicked", async () => {
    const onSelectMode = vi.fn();
    render(<AgentEntryPoint onSelectMode={onSelectMode} />);
    await userEvent.click(screen.getByText(/describe what you need/i).closest("[class]"));
    expect(onSelectMode).toHaveBeenCalledWith("agent_first", "chat");
  });

  it("calls onSelectMode with upload_first and upload when second card clicked", async () => {
    const onSelectMode = vi.fn();
    render(<AgentEntryPoint onSelectMode={onSelectMode} />);
    await userEvent.click(screen.getByText(/upload your dataset/i).closest("[class]"));
    expect(onSelectMode).toHaveBeenCalledWith("upload_first", "upload");
  });
});
