"""Unit tests for backend/engine/validator.py.

Every rule type has at least one passing-row test and one failing-row test.
The 3-attempt regeneration loop is exercised directly.
"""

import pandas as pd
import pytest

from backend.engine.validator import validate_dataframe, validate_row
from backend.models.schemas import Constraint


# ── Helpers ───────────────────────────────────────────────────────────────────

def bound(col, lo=None, hi=None, **extra):
    return Constraint(rule_type="bound", column=col, params={
        **({"min": lo} if lo is not None else {}),
        **({"max": hi} if hi is not None else {}),
        **extra,
    })

def conditional(if_col, if_val, then_col, **params):
    return Constraint(rule_type="conditional", column=if_col, params={
        "if_column": if_col, "if_value": if_val, "then_column": then_col, **params,
    })

def relational(col_a, col_b, operator="<="):
    return Constraint(rule_type="relational", columns=[col_a, col_b], params={"operator": operator})

def temporal(before_col, after_col):
    return Constraint(rule_type="temporal", columns=[before_col, after_col], params={
        "before_column": before_col, "after_column": after_col,
    })


# ── Bound ──────────────────────────────────────────────────────────────────────

class TestBoundRule:
    def test_passes_within_range(self):
        c = bound("amount", lo=0.01, hi=1000.0)
        assert validate_row({"amount": 500.0}, [c])

    def test_fails_below_min(self):
        c = bound("amount", lo=0.01)
        assert not validate_row({"amount": 0.0}, [c])

    def test_fails_above_max(self):
        c = bound("amount", hi=1000.0)
        assert not validate_row({"amount": 1001.0}, [c])

    def test_passes_at_exact_min(self):
        c = bound("amount", lo=10.0)
        assert validate_row({"amount": 10.0}, [c])

    def test_passes_at_exact_max(self):
        c = bound("amount", hi=10.0)
        assert validate_row({"amount": 10.0}, [c])

    def test_missing_column_passes(self):
        c = bound("amount", lo=0.01)
        assert validate_row({"channel": "online"}, [c])

    def test_none_value_passes(self):
        c = bound("amount", lo=0.01)
        assert validate_row({"amount": None}, [c])

    def test_non_numeric_value_passes(self):
        c = bound("amount", lo=0.0)
        assert validate_row({"amount": "not_a_number"}, [c])


# ── Conditional ───────────────────────────────────────────────────────────────

class TestConditionalRule:
    def test_condition_not_triggered_passes(self):
        c = conditional("channel", "atm", "amount", then_min=20.0, then_max=3000.0)
        assert validate_row({"channel": "online", "amount": 0.5}, [c])

    def test_condition_triggered_within_range_passes(self):
        c = conditional("channel", "atm", "amount", then_min=20.0, then_max=3000.0)
        assert validate_row({"channel": "atm", "amount": 200.0}, [c])

    def test_condition_triggered_below_min_fails(self):
        c = conditional("channel", "atm", "amount", then_min=20.0)
        assert not validate_row({"channel": "atm", "amount": 5.0}, [c])

    def test_condition_triggered_above_max_fails(self):
        c = conditional("channel", "atm", "amount", then_max=3000.0)
        assert not validate_row({"channel": "atm", "amount": 5000.0}, [c])

    def test_modulo_passes_for_round_number(self):
        c = conditional("channel", "atm", "amount", modulo=20, modulo_result=0)
        assert validate_row({"channel": "atm", "amount": 100}, [c])

    def test_modulo_fails_for_non_round_number(self):
        c = conditional("channel", "atm", "amount", modulo=20, modulo_result=0)
        assert not validate_row({"channel": "atm", "amount": 55}, [c])

    def test_then_equals_passes(self):
        c = conditional("type", "refund", "direction", then_equals="credit")
        assert validate_row({"type": "refund", "direction": "credit"}, [c])

    def test_then_equals_fails(self):
        c = conditional("type", "refund", "direction", then_equals="credit")
        assert not validate_row({"type": "refund", "direction": "debit"}, [c])


# ── Relational ────────────────────────────────────────────────────────────────

class TestRelationalRule:
    def test_lte_passes(self):
        c = relational("amount", "limit", "<=")
        assert validate_row({"amount": 500.0, "limit": 1000.0}, [c])

    def test_lte_fails(self):
        c = relational("amount", "limit", "<=")
        assert not validate_row({"amount": 1500.0, "limit": 1000.0}, [c])

    def test_gte_passes(self):
        c = relational("settlement", "transaction", ">=")
        assert validate_row({"settlement": 200.0, "transaction": 100.0}, [c])

    def test_gte_fails(self):
        c = relational("settlement", "transaction", ">=")
        assert not validate_row({"settlement": 50.0, "transaction": 100.0}, [c])

    def test_equal_passes(self):
        c = relational("fee", "expected_fee", "==")
        assert validate_row({"fee": 5.0, "expected_fee": 5.0}, [c])

    def test_missing_column_passes(self):
        c = relational("col_a", "col_b", "<=")
        assert validate_row({"col_a": 10.0}, [c])


# ── Temporal ──────────────────────────────────────────────────────────────────

class TestTemporalRule:
    def test_before_on_same_day_passes(self):
        c = temporal("created_at", "settled_at")
        assert validate_row({
            "created_at": "2024-01-01T10:00:00",
            "settled_at": "2024-01-01T12:00:00",
        }, [c])

    def test_same_timestamp_passes(self):
        c = temporal("created_at", "settled_at")
        assert validate_row({
            "created_at": "2024-01-01",
            "settled_at": "2024-01-01",
        }, [c])

    def test_reversed_order_fails(self):
        c = temporal("created_at", "settled_at")
        assert not validate_row({
            "created_at": "2024-01-05",
            "settled_at": "2024-01-01",
        }, [c])

    def test_unparseable_timestamps_pass(self):
        c = temporal("created_at", "settled_at")
        assert validate_row({"created_at": "not_a_date", "settled_at": "also_not"}, [c])

    def test_missing_column_passes(self):
        c = temporal("created_at", "settled_at")
        assert validate_row({"created_at": "2024-01-01"}, [c])


# ── validate_dataframe ────────────────────────────────────────────────────────

class TestValidateDataframe:
    def _resample(self, _index):
        return {"amount": 500.0}

    def test_all_valid_rows_returned(self):
        df = pd.DataFrame({"amount": [100.0, 200.0, 300.0]})
        c = bound("amount", lo=0.01, hi=1000.0)
        result, failures = validate_dataframe(df, [c], self._resample)
        assert len(result) == 3
        assert failures == 0

    def test_invalid_rows_trigger_regeneration(self):
        df = pd.DataFrame({"amount": [-1.0, 500.0, -2.0]})
        c = bound("amount", lo=0.01)
        result, failures = validate_dataframe(df, [c], self._resample)
        # Regen produces 500.0 which passes, so 2 rows regenerated successfully
        assert failures == 0
        assert len(result) == 3

    def test_unregenerable_rows_excluded_and_counted(self):
        df = pd.DataFrame({"amount": [-1.0, -2.0]})
        c = bound("amount", lo=0.01)

        def always_invalid(_index):
            return {"amount": -99.0}

        result, failures = validate_dataframe(df, [c], always_invalid)
        assert failures == 2
        assert len(result) == 0

    def test_no_constraints_returns_full_df(self):
        df = pd.DataFrame({"amount": [1.0, 2.0, 3.0]})
        result, failures = validate_dataframe(df, [], self._resample)
        assert len(result) == 3
        assert failures == 0

    def test_unknown_rule_type_does_not_raise(self):
        df = pd.DataFrame({"amount": [100.0]})
        c = Constraint(rule_type="bound", column="amount", params={"min": 0.0})
        c.rule_type = "unknown_type"  # type: ignore
        result, failures = validate_dataframe(df, [c], self._resample)
        assert len(result) == 1
