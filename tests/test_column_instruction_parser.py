"""Tests for backend/intelligence/column_instruction_parser.py.

ALL LLM calls are mocked via unittest.mock.patch — no live API calls ever.
"""

from __future__ import annotations

import json
from unittest.mock import patch

import pytest

from backend.intelligence.column_instruction_parser import parse_column_instruction
from backend.models.schemas import ColumnInstructionResponse


# ── Helpers ───────────────────────────────────────────────────────────────────

def _normal_payload(column_name: str = "amount") -> str:
    return json.dumps({
        "success": True,
        "updated_distribution_hint": "normal",
        "updated_params": {"loc": 50000.0, "scale": 10000.0},
        "readable_summary": "Amount follows a normal distribution centred at 50,000 with std 10,000.",
        "constraints_to_add": [],
        "error_message": None,
    })


def _lognormal_with_bound_payload() -> str:
    return json.dumps({
        "success": True,
        "updated_distribution_hint": "lognormal",
        "updated_params": {"s": 1.5, "loc": 0.0, "scale": 150.0, "max": 50000.0},
        "readable_summary": "Log-normal distribution, mostly small transactions, capped at $50,000.",
        "constraints_to_add": [
            {
                "rule_type": "bound",
                "column": "amount",
                "params": {"min": 0.0, "max": 50000.0},
                "readable_summary": "Amount must not exceed $50,000.",
            }
        ],
        "error_message": None,
    })


def _categorical_allowed_values_payload() -> str:
    return json.dumps({
        "success": True,
        "updated_distribution_hint": "categorical",
        "updated_params": {"allowed_values": ["VISA", "Mastercard", "Amex"]},
        "readable_summary": "Card type is one of VISA, Mastercard, or Amex.",
        "constraints_to_add": [],
        "error_message": None,
    })


def _id_format_payload() -> str:
    return json.dumps({
        "success": True,
        "updated_distribution_hint": "categorical",
        "updated_params": {"format_pattern": "784-XXXX-XXXXXXX-X"},
        "readable_summary": "Emirates ID formatted as 784-XXXX-XXXXXXX-X.",
        "constraints_to_add": [],
        "error_message": None,
    })


def _datetime_business_hours_payload() -> str:
    return json.dumps({
        "success": True,
        "updated_distribution_hint": None,
        "updated_params": {
            "business_hours_only": True,
            "time_start": "2024-01-01T09:00:00",
            "time_end": "2024-12-31T18:00:00",
        },
        "readable_summary": "Timestamps during business hours (9am–6pm) throughout 2024.",
        "constraints_to_add": [],
        "error_message": None,
    })


def _uniform_payload() -> str:
    return json.dumps({
        "success": True,
        "updated_distribution_hint": "uniform",
        "updated_params": {"loc": 18.0, "scale": 47.0},
        "readable_summary": "Age uniformly distributed between 18 and 65.",
        "constraints_to_add": [],
        "error_message": None,
    })


def _failure_payload(error: str = "Instruction is too ambiguous.") -> str:
    return json.dumps({
        "success": False,
        "updated_distribution_hint": None,
        "updated_params": {},
        "readable_summary": None,
        "constraints_to_add": [],
        "error_message": error,
    })


# ── Happy-path tests ──────────────────────────────────────────────────────────

class TestParseColumnInstructionHappy:
    def test_continuous_normal_instruction(self):
        with patch("backend.intelligence.column_instruction_parser.call_llm") as mock_llm:
            mock_llm.return_value = _normal_payload()
            result = parse_column_instruction(
                column_name="amount",
                col_type="continuous",
                instruction_text="normally distributed around 50,000 with std 10,000",
            )
        assert result.success is True
        assert result.updated_distribution_hint == "normal"
        assert result.updated_params.get("loc") == pytest.approx(50000.0)
        assert result.updated_params.get("scale") == pytest.approx(10000.0)
        assert result.readable_summary is not None

    def test_continuous_lognormal_with_bound_constraint(self):
        with patch("backend.intelligence.column_instruction_parser.call_llm") as mock_llm:
            mock_llm.return_value = _lognormal_with_bound_payload()
            result = parse_column_instruction(
                column_name="amount",
                col_type="continuous",
                instruction_text="log-normal, mostly small transactions under $500, occasional up to $50,000",
            )
        assert result.success is True
        assert result.updated_distribution_hint == "lognormal"
        assert len(result.constraints_to_add) == 1
        assert result.constraints_to_add[0]["rule_type"] == "bound"
        assert result.updated_params.get("max") == pytest.approx(50000.0)

    def test_categorical_allowed_values(self):
        with patch("backend.intelligence.column_instruction_parser.call_llm") as mock_llm:
            mock_llm.return_value = _categorical_allowed_values_payload()
            result = parse_column_instruction(
                column_name="card_type",
                col_type="categorical",
                instruction_text="one of: VISA, Mastercard, Amex",
            )
        assert result.success is True
        assert result.updated_distribution_hint == "categorical"
        assert "VISA" in result.updated_params.get("allowed_values", [])
        assert "Mastercard" in result.updated_params.get("allowed_values", [])
        assert "Amex" in result.updated_params.get("allowed_values", [])

    def test_id_format_pattern(self):
        with patch("backend.intelligence.column_instruction_parser.call_llm") as mock_llm:
            mock_llm.return_value = _id_format_payload()
            result = parse_column_instruction(
                column_name="emirates_id",
                col_type="id",
                instruction_text="Emirates ID format: 784-XXXX-XXXXXXX-X",
            )
        assert result.success is True
        assert result.updated_params.get("format_pattern") is not None
        assert "784" in result.updated_params["format_pattern"]

    def test_datetime_business_hours(self):
        with patch("backend.intelligence.column_instruction_parser.call_llm") as mock_llm:
            mock_llm.return_value = _datetime_business_hours_payload()
            result = parse_column_instruction(
                column_name="transaction_time",
                col_type="datetime",
                instruction_text="business hours only, 9am–6pm, year 2024",
            )
        assert result.success is True
        assert result.updated_params.get("business_hours_only") is True
        assert result.updated_params.get("time_start") is not None
        assert result.updated_params.get("time_end") is not None

    def test_uniform_range(self):
        with patch("backend.intelligence.column_instruction_parser.call_llm") as mock_llm:
            mock_llm.return_value = _uniform_payload()
            result = parse_column_instruction(
                column_name="age",
                col_type="continuous",
                instruction_text="uniform between 18 and 65",
            )
        assert result.success is True
        assert result.updated_distribution_hint == "uniform"
        assert result.updated_params.get("loc") == pytest.approx(18.0)
        assert result.updated_params.get("scale") == pytest.approx(47.0)

    def test_readable_summary_is_string(self):
        with patch("backend.intelligence.column_instruction_parser.call_llm") as mock_llm:
            mock_llm.return_value = _normal_payload()
            result = parse_column_instruction(
                column_name="amount", col_type="continuous", instruction_text="normal distribution"
            )
        assert isinstance(result.readable_summary, str)
        assert len(result.readable_summary) > 5

    def test_existing_params_forwarded_in_message(self):
        """The user message must include existing_params for the LLM to consider."""
        captured = {}

        def capture(system_prompt, user_message, **kwargs):
            captured["user_message"] = user_message
            return _normal_payload()

        with patch("backend.intelligence.column_instruction_parser.call_llm", side_effect=capture):
            parse_column_instruction(
                column_name="amount",
                col_type="continuous",
                instruction_text="normal",
                existing_params={"loc": 100.0, "scale": 10.0},
            )

        assert "100.0" in captured["user_message"]


# ── LLM failure / edge-case tests ─────────────────────────────────────────────

class TestParseColumnInstructionFailures:
    def test_llm_returns_none(self):
        """LLM timeout or error → success=False, no exception raised."""
        with patch("backend.intelligence.column_instruction_parser.call_llm") as mock_llm:
            mock_llm.return_value = None
            result = parse_column_instruction(
                column_name="amount", col_type="continuous", instruction_text="normal"
            )
        assert isinstance(result, ColumnInstructionResponse)
        assert result.success is False
        assert result.error_message is not None

    def test_llm_returns_invalid_json(self):
        with patch("backend.intelligence.column_instruction_parser.call_llm") as mock_llm:
            mock_llm.return_value = "not valid json {"
            result = parse_column_instruction(
                column_name="amount", col_type="continuous", instruction_text="normal"
            )
        assert result.success is False
        assert result.error_message is not None

    def test_llm_returns_partial_json_missing_fields(self):
        with patch("backend.intelligence.column_instruction_parser.call_llm") as mock_llm:
            mock_llm.return_value = json.dumps({"success": True})
            result = parse_column_instruction(
                column_name="amount", col_type="continuous", instruction_text="normal"
            )
        # Partial but valid — should succeed with empty params
        assert isinstance(result, ColumnInstructionResponse)

    def test_llm_raises_exception_internally(self):
        """call_llm side_effect simulating an exception handled in client.py → returns None."""
        with patch("backend.intelligence.column_instruction_parser.call_llm") as mock_llm:
            mock_llm.return_value = None  # client.py catches exceptions and returns None
            result = parse_column_instruction(
                column_name="amount", col_type="continuous", instruction_text="anything"
            )
        assert result.success is False

    def test_ambiguous_instruction_returns_success_false(self):
        with patch("backend.intelligence.column_instruction_parser.call_llm") as mock_llm:
            mock_llm.return_value = _failure_payload("The instruction is too vague to configure.")
            result = parse_column_instruction(
                column_name="x", col_type="continuous", instruction_text="make it good"
            )
        assert result.success is False
        assert "vague" in result.error_message.lower() or result.error_message is not None

    def test_constraints_to_add_is_empty_list_on_failure(self):
        with patch("backend.intelligence.column_instruction_parser.call_llm") as mock_llm:
            mock_llm.return_value = None
            result = parse_column_instruction(
                column_name="x", col_type="continuous", instruction_text="x"
            )
        assert result.constraints_to_add == []

    def test_updated_params_is_empty_dict_on_failure(self):
        with patch("backend.intelligence.column_instruction_parser.call_llm") as mock_llm:
            mock_llm.return_value = None
            result = parse_column_instruction(
                column_name="x", col_type="continuous", instruction_text="x"
            )
        assert result.updated_params == {}

    def test_null_values_in_params_stripped(self):
        """Null values in LLM response should not appear in updated_params."""
        payload = json.dumps({
            "success": True,
            "updated_distribution_hint": "normal",
            "updated_params": {"loc": 100.0, "scale": None, "s": None},
            "readable_summary": "Normal centred at 100.",
            "constraints_to_add": [],
            "error_message": None,
        })
        with patch("backend.intelligence.column_instruction_parser.call_llm") as mock_llm:
            mock_llm.return_value = payload
            result = parse_column_instruction(
                column_name="x", col_type="continuous", instruction_text="normal at 100"
            )
        assert result.success is True
        assert "scale" not in result.updated_params  # None values stripped
        assert result.updated_params.get("loc") == pytest.approx(100.0)

    def test_does_not_raise_on_any_input(self):
        """The function must never raise regardless of LLM output."""
        for bad_response in [None, "", "{}", "null", "[]", "true"]:
            with patch("backend.intelligence.column_instruction_parser.call_llm") as mock_llm:
                mock_llm.return_value = bad_response
                result = parse_column_instruction(
                    column_name="x", col_type="continuous", instruction_text="anything"
                )
            assert isinstance(result, ColumnInstructionResponse)


# ── Prompt loading test ───────────────────────────────────────────────────────

class TestPromptFile:
    def test_parse_column_instruction_prompt_loads(self):
        from backend.intelligence.client import load_prompt
        from backend.constants import PROMPT_VERSIONS
        text = load_prompt(PROMPT_VERSIONS["parse_column_instruction"])
        assert "Calibra" in text
        assert "success" in text
        assert "distribution" in text

    def test_prompt_instructs_json_only_output(self):
        from backend.intelligence.client import load_prompt
        from backend.constants import PROMPT_VERSIONS
        text = load_prompt(PROMPT_VERSIONS["parse_column_instruction"])
        assert "JSON" in text
        assert "preamble" in text.lower() or "only" in text.lower()
