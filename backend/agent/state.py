"""AgentState and supporting schemas for the Calibra agent layer."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field

from backend.models.schemas import GenerationConfig


class ToolCallRecord(BaseModel):
    tool_name: str
    inputs: dict[str, Any]
    result: str
    called_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AgentState(BaseModel):
    session_id: str
    mode: Literal["chat", "wizard"]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    messages: list[dict[str, Any]] = Field(default_factory=list)
    config: GenerationConfig = Field(default_factory=GenerationConfig)
    wizard_step: int | None = None
    wizard_completed_steps: list[int] = Field(default_factory=list)
    entry_point: Literal["agent_first", "upload_first"] = "agent_first"
    upload_session_id: str | None = None
    preview_run_id: str | None = None
    tool_calls_log: list[ToolCallRecord] = Field(default_factory=list)
