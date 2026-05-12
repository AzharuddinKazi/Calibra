"""Shared Anthropic LLM client for all intelligence modules.

One client instance. All three intelligence modules import call_llm / load_prompt
from here — never instantiate anthropic.Anthropic() elsewhere.
"""

from __future__ import annotations

import logging
from pathlib import Path

import anthropic

from backend.constants import LLM_MAX_TOKENS, LLM_MODEL, LLM_TIMEOUT_SECONDS

logger = logging.getLogger(__name__)

PROMPT_DIR = Path(__file__).parent / "prompts"

_client = anthropic.Anthropic()


def load_prompt(filename: str) -> str:
    """Load a versioned prompt file from the prompts directory."""
    path = PROMPT_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"Prompt file not found: {filename}")
    return path.read_text(encoding="utf-8")


def call_llm(
    system_prompt: str,
    user_message: str,
    max_tokens: int = LLM_MAX_TOKENS,
    timeout: float = LLM_TIMEOUT_SECONDS,
) -> str | None:
    """Call Claude with a system + user message pair.

    Returns the text response, or None on any failure (timeout, API error,
    validation failure). Never raises — callers must treat None as a fallback
    trigger.
    """
    try:
        message = _client.messages.create(
            model=LLM_MODEL,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
            timeout=timeout,
        )
        return message.content[0].text
    except Exception as exc:
        logger.error("LLM call failed: %s", exc)
        return None
