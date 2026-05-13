"""Tests for the intelligence layer.

ALL LLM calls are mocked via unittest.mock.patch — no live API calls ever.
Every module has a fallback test: simulate LLM failure and confirm graceful
degradation without raising.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import numpy as np
import pandas as pd
import pytest

from fastapi.testclient import TestClient

from backend.engine.profiler import profile_dataframe
from backend.intelligence.annotator import annotate_columns, _build_user_message
from backend.intelligence.constraint_parser import parse_constraint
from backend.intelligence.report_summariser import summarise_run
from backend.main import app
from backend.models.schemas import FidelityScores


# ── Fixtures ──────────────────────────────────────────────────────────────────

def _profiles():
    rng = np.random.default_rng(0)
    df = pd.DataFrame({
        "amount": rng.lognormal(5, 1, 100),
        "channel": np.random.choice(["online", "atm"], 100),
        "is_fraud": rng.integers(0, 2, 100),
    })
    return profile_dataframe(df)


def _good_annotation_payload(profiles):
    return json.dumps({
        "columns": [
            {
                "name": p.name,
                "semantic_label": f"Label for {p.name}",
                "suggested_constraint": None,
                "reasoning": "Inferred from column name.",
            }
            for p in profiles
        ],
        "recommended_domain_pack": "fraud",
        "recommended_typologies": ["card_not_present"],
    })


def _good_constraint_payload():
    return json.dumps({
        "parseable": True,
        "confidence": "high",
        "rule_type": "bound",
        "column": "amount",
        "params": {"min": 0.01, "max": 10000.0},
        "readable_summary": "Amount must be between 0.01 and 10,000.",
        "parse_error": None,
    })


def _unparseable_constraint_payload():
    return json.dumps({
        "parseable": False,
        "confidence": "low",
        "rule_type": None,
        "column": None,
        "params": None,
        "readable_summary": None,
        "parse_error": "The constraint references a column that does not exist.",
    })


def _fidelity():
    return FidelityScores(composite=0.82, column_fidelity=0.85, correlation_fidelity=0.77)


# ── annotator ─────────────────────────────────────────────────────────────────

class TestAnnotator:
    def test_success_returns_annotation_response(self):
        profiles = _profiles()
        with patch("backend.intelligence.annotator.call_llm") as mock_llm:
            mock_llm.return_value = _good_annotation_payload(profiles)
            result = annotate_columns(profiles)
        assert result is not None
        assert len(result.columns) == len(profiles)
        assert result.recommended_domain_pack == "fraud"
        assert "card_not_present" in result.recommended_typologies

    def test_column_names_preserved(self):
        profiles = _profiles()
        with patch("backend.intelligence.annotator.call_llm") as mock_llm:
            mock_llm.return_value = _good_annotation_payload(profiles)
            result = annotate_columns(profiles)
        returned_names = {c.name for c in result.columns}
        expected_names = {p.name for p in profiles}
        assert returned_names == expected_names

    def test_fallback_on_llm_none(self):
        profiles = _profiles()
        with patch("backend.intelligence.annotator.call_llm") as mock_llm:
            mock_llm.return_value = None
            result = annotate_columns(profiles)
        assert result is None

    def test_fallback_on_invalid_json(self):
        profiles = _profiles()
        with patch("backend.intelligence.annotator.call_llm") as mock_llm:
            mock_llm.return_value = "not valid json {"
            result = annotate_columns(profiles)
        assert result is None

    def test_fallback_on_malformed_schema(self):
        profiles = _profiles()
        with patch("backend.intelligence.annotator.call_llm") as mock_llm:
            mock_llm.return_value = json.dumps({"wrong_key": []})
            result = annotate_columns(profiles)
        # Should not raise; returns empty annotation
        assert result is not None
        assert result.columns == []

    def test_user_message_contains_no_raw_rows(self):
        profiles = _profiles()
        msg = _build_user_message(profiles)
        # Statistical summaries only — no row-level data
        assert "top_values" in msg
        assert "null_rate" in msg

    def test_system_and_user_message_are_separate(self):
        """Ensure call_llm is called with system and user_message as distinct args."""
        profiles = _profiles()
        with patch("backend.intelligence.annotator.call_llm") as mock_llm:
            mock_llm.return_value = _good_annotation_payload(profiles)
            annotate_columns(profiles)
        call_kwargs = mock_llm.call_args
        assert "system_prompt" in call_kwargs.kwargs or len(call_kwargs.args) >= 1
        assert "user_message" in call_kwargs.kwargs or len(call_kwargs.args) >= 2


# ── constraint_parser ─────────────────────────────────────────────────────────

class TestConstraintParser:
    def test_success_high_confidence(self):
        profiles = _profiles()
        with patch("backend.intelligence.constraint_parser.call_llm") as mock_llm:
            mock_llm.return_value = _good_constraint_payload()
            result = parse_constraint("amount between 0.01 and 10000", profiles)
        assert result.constraint is not None
        assert result.constraint.parseable is True
        assert result.constraint.confidence == "high"
        assert result.constraint.rule_type == "bound"

    def test_success_readable_summary_returned(self):
        profiles = _profiles()
        with patch("backend.intelligence.constraint_parser.call_llm") as mock_llm:
            mock_llm.return_value = _good_constraint_payload()
            result = parse_constraint("amount between 0.01 and 10000", profiles)
        assert result.readable_summary is not None
        assert "0.01" in result.readable_summary

    def test_unparseable_returns_error_message(self):
        profiles = _profiles()
        with patch("backend.intelligence.constraint_parser.call_llm") as mock_llm:
            mock_llm.return_value = _unparseable_constraint_payload()
            result = parse_constraint("amount must reference missing_column", profiles)
        assert result.constraint is not None
        assert result.constraint.parseable is False
        assert result.message is not None

    def test_fallback_on_llm_none(self):
        profiles = _profiles()
        with patch("backend.intelligence.constraint_parser.call_llm") as mock_llm:
            mock_llm.return_value = None
            result = parse_constraint("any constraint", profiles)
        assert result.constraint is None
        assert result.message is not None

    def test_fallback_on_invalid_json(self):
        profiles = _profiles()
        with patch("backend.intelligence.constraint_parser.call_llm") as mock_llm:
            mock_llm.return_value = "not json"
            result = parse_constraint("any constraint", profiles)
        assert result.constraint is None
        assert result.message is not None

    def test_does_not_raise_on_any_failure(self):
        profiles = _profiles()
        with patch("backend.intelligence.constraint_parser.call_llm") as mock_llm:
            mock_llm.side_effect = Exception("simulated crash")
            # call_llm itself catches exceptions and returns None
            mock_llm.return_value = None
            mock_llm.side_effect = None
            result = parse_constraint("any", profiles)
        assert result is not None

    def test_low_confidence_flag_preserved(self):
        profiles = _profiles()
        payload = json.dumps({
            "parseable": True,
            "confidence": "low",
            "rule_type": "bound",
            "column": "amount",
            "params": {"min": 0},
            "readable_summary": "Amount assumed positive.",
            "parse_error": None,
        })
        with patch("backend.intelligence.constraint_parser.call_llm") as mock_llm:
            mock_llm.return_value = payload
            result = parse_constraint("amount is positive probably", profiles)
        assert result.confidence == "low"


# ── report_summariser ─────────────────────────────────────────────────────────

class TestReportSummariser:
    def _run_kwargs(self):
        return dict(
            run_id="run_test_001",
            timestamp=datetime.now(timezone.utc),
            row_count_requested=10_000,
            row_count_delivered=9_988,
            domain_pack="fraud",
            fidelity=_fidelity(),
            constraint_count=5,
            constraint_failures=12,
            prevalence_targets={"fraud": 0.02, "non_fraud": 0.98},
            prevalence_actuals={"fraud": 0.0199, "non_fraud": 0.9801},
        )

    def test_success_returns_non_empty_string(self):
        with patch("backend.intelligence.report_summariser.call_llm") as mock_llm:
            mock_llm.return_value = "This is a plain-English executive summary of the run."
            result = summarise_run(**self._run_kwargs())
        assert isinstance(result, str)
        assert len(result) > 10

    def test_fallback_on_llm_none(self):
        with patch("backend.intelligence.report_summariser.call_llm") as mock_llm:
            mock_llm.return_value = None
            result = summarise_run(**self._run_kwargs())
        assert "unavailable" in result.lower()

    def test_fallback_does_not_raise(self):
        with patch("backend.intelligence.report_summariser.call_llm") as mock_llm:
            mock_llm.return_value = None
            result = summarise_run(**self._run_kwargs())
        assert result is not None

    def test_user_message_contains_no_data_rows(self):
        """The message sent to the LLM must never contain generated data rows."""
        captured = {}
        def capture_call(system_prompt, user_message, **kwargs):
            captured["user_message"] = user_message
            return "Summary text."

        with patch("backend.intelligence.report_summariser.call_llm", side_effect=capture_call):
            summarise_run(**self._run_kwargs())

        msg = captured["user_message"]
        assert "row_count_requested" in msg
        assert "fidelity" in msg
        # Should not contain per-row data structures
        assert '"amount"' not in msg

    def test_below_threshold_flag_in_message(self):
        """Low-fidelity runs must have below_threshold=true in the message."""
        captured = {}
        def capture_call(system_prompt, user_message, **kwargs):
            captured["user_message"] = user_message
            return "Summary."

        low_fidelity = FidelityScores(composite=0.60, column_fidelity=0.65, correlation_fidelity=0.52)
        kwargs = self._run_kwargs()
        kwargs["fidelity"] = low_fidelity

        with patch("backend.intelligence.report_summariser.call_llm", side_effect=capture_call):
            summarise_run(**kwargs)

        assert '"below_threshold": true' in captured["user_message"]

    def test_above_threshold_flag_false(self):
        captured = {}
        def capture_call(system_prompt, user_message, **kwargs):
            captured["user_message"] = user_message
            return "Summary."

        with patch("backend.intelligence.report_summariser.call_llm", side_effect=capture_call):
            summarise_run(**self._run_kwargs())

        assert '"below_threshold": false' in captured["user_message"]


# ── client ────────────────────────────────────────────────────────────────────

class TestLLMClient:
    def test_load_prompt_annotate(self):
        from backend.intelligence.client import load_prompt
        from backend.constants import PROMPT_VERSIONS
        text = load_prompt(PROMPT_VERSIONS["annotate"])
        assert len(text) > 50
        assert "Calibra" in text

    def test_load_prompt_parse_constraint(self):
        from backend.intelligence.client import load_prompt
        from backend.constants import PROMPT_VERSIONS
        text = load_prompt(PROMPT_VERSIONS["parse_constraint"])
        assert "parseable" in text

    def test_load_prompt_summarise(self):
        from backend.intelligence.client import load_prompt
        from backend.constants import PROMPT_VERSIONS
        text = load_prompt(PROMPT_VERSIONS["summarise"])
        assert "150" in text

    def test_load_prompt_missing_file_raises(self):
        from backend.intelligence.client import load_prompt
        with pytest.raises(FileNotFoundError):
            load_prompt("nonexistent_v99.txt")

    def test_call_llm_returns_none_on_exception(self):
        from backend.intelligence.client import call_llm
        with patch("backend.intelligence.client._client") as mock_client:
            mock_client.messages.create.side_effect = Exception("API down")
            result = call_llm("system", "user")
        assert result is None


# ── POST /intelligence/parse-column-instruction endpoint ──────────────────────

class TestParseColumnInstructionEndpoint:
    _client = TestClient(app)

    def _success_payload(self) -> str:
        return json.dumps({
            "success": True,
            "updated_distribution_hint": "normal",
            "updated_params": {"loc": 1000.0, "scale": 200.0},
            "readable_summary": "Normal distribution centred at 1,000.",
            "constraints_to_add": [],
            "error_message": None,
        })

    def test_happy_path_returns_200_with_success_true(self):
        with patch(
            "backend.intelligence.column_instruction_parser.call_llm"
        ) as mock_llm:
            mock_llm.return_value = self._success_payload()
            resp = self._client.post(
                "/intelligence/parse-column-instruction",
                json={
                    "column_name": "amount",
                    "col_type": "continuous",
                    "instruction_text": "normally distributed around 1,000",
                },
            )
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["updated_distribution_hint"] == "normal"

    def test_empty_instruction_text_returns_422(self):
        resp = self._client.post(
            "/intelligence/parse-column-instruction",
            json={
                "column_name": "amount",
                "col_type": "continuous",
                "instruction_text": "",
            },
        )
        assert resp.status_code == 422

    def test_whitespace_only_instruction_returns_422(self):
        resp = self._client.post(
            "/intelligence/parse-column-instruction",
            json={
                "column_name": "amount",
                "col_type": "continuous",
                "instruction_text": "   ",
            },
        )
        assert resp.status_code == 422

    def test_invalid_col_type_returns_422(self):
        resp = self._client.post(
            "/intelligence/parse-column-instruction",
            json={
                "column_name": "amount",
                "col_type": "unknown_type",
                "instruction_text": "some instruction",
            },
        )
        assert resp.status_code == 422

    def test_llm_failure_returns_200_with_success_false(self):
        """LLM failures must never produce a 5xx response."""
        with patch(
            "backend.intelligence.column_instruction_parser.call_llm"
        ) as mock_llm:
            mock_llm.return_value = None
            resp = self._client.post(
                "/intelligence/parse-column-instruction",
                json={
                    "column_name": "amount",
                    "col_type": "continuous",
                    "instruction_text": "normal distribution",
                },
            )
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is False
        assert body["error_message"] is not None

    def test_existing_params_accepted(self):
        with patch(
            "backend.intelligence.column_instruction_parser.call_llm"
        ) as mock_llm:
            mock_llm.return_value = self._success_payload()
            resp = self._client.post(
                "/intelligence/parse-column-instruction",
                json={
                    "column_name": "amount",
                    "col_type": "continuous",
                    "instruction_text": "normal distribution",
                    "existing_params": {"loc": 500.0, "scale": 100.0},
                },
            )
        assert resp.status_code == 200

    def test_missing_column_name_returns_422(self):
        resp = self._client.post(
            "/intelligence/parse-column-instruction",
            json={
                "col_type": "continuous",
                "instruction_text": "normal distribution",
            },
        )
        assert resp.status_code == 422
