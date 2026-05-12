"""Unit tests for backend/engine/profiler.py — ≥80% line coverage."""

import numpy as np
import pandas as pd
import pytest

from backend.engine.profiler import profile_dataframe, _infer_type, _fit_continuous


# ── Type inference ────────────────────────────────────────────────────────────

class TestInferType:
    def test_boolean_int(self):
        s = pd.Series([0, 1, 0, 1, 1])
        assert _infer_type(s) == "boolean"

    def test_boolean_string(self):
        s = pd.Series(["0", "1", "0", "1"])
        assert _infer_type(s) == "boolean"

    def test_categorical_low_cardinality(self):
        s = pd.Series(["A", "B", "C", "A", "B"])
        assert _infer_type(s) == "categorical"

    def test_categorical_numeric_low_unique(self):
        s = pd.Series([1, 2, 3, 1, 2, 3, 1])
        assert _infer_type(s) == "categorical"

    def test_continuous_high_cardinality_float(self):
        rng = np.random.default_rng(0)
        s = pd.Series(rng.normal(100, 20, 200))
        assert _infer_type(s) == "continuous"

    def test_id_high_cardinality_string(self):
        s = pd.Series([f"id_{i}" for i in range(200)])
        assert _infer_type(s) == "id"

    def test_datetime_detection(self):
        s = pd.Series(["2024-01-01", "2024-01-02", "2024-01-03"])
        assert _infer_type(s) == "datetime"

    def test_empty_series_returns_categorical(self):
        s = pd.Series([], dtype=object)
        assert _infer_type(s) == "categorical"

    def test_all_nulls(self):
        s = pd.Series([None, None, None])
        result = _infer_type(s)
        assert result in ("categorical", "continuous", "id")


# ── Distribution fitting ───────────────────────────────────────────────────────

class TestFitContinuous:
    def test_returns_normal_or_lognormal(self):
        rng = np.random.default_rng(42)
        data = pd.Series(rng.normal(50, 10, 500))
        dist, params = _fit_continuous(data)
        assert dist in ("normal", "lognormal")
        assert "loc" in params or "s" in params

    def test_lognormal_selected_for_lognormal_data(self):
        rng = np.random.default_rng(42)
        data = pd.Series(rng.lognormal(mean=3, sigma=1, size=500))
        dist, _ = _fit_continuous(data)
        assert dist == "lognormal"

    def test_normal_selected_for_normal_data(self):
        rng = np.random.default_rng(42)
        data = pd.Series(rng.normal(0, 1, 500))
        dist, _ = _fit_continuous(data)
        assert dist == "normal"

    def test_tiny_series_fallback(self):
        data = pd.Series([1.0, 2.0])
        dist, params = _fit_continuous(data)
        assert dist in ("normal", "lognormal")
        assert isinstance(params, dict)


# ── Full profiler ────────────────────────────────────────────────────────────

class TestProfileDataframe:
    def _make_df(self):
        rng = np.random.default_rng(0)
        return pd.DataFrame({
            "amount": rng.lognormal(5, 1, 100),
            "channel": rng.choice(["online", "atm", "branch"], 100),
            "is_fraud": rng.integers(0, 2, 100),
            "transaction_date": pd.date_range("2024-01-01", periods=100, freq="h").astype(str),
            "account_id": [f"ACC{i:06d}" for i in range(100)],
        })

    def test_returns_one_profile_per_column(self):
        df = self._make_df()
        profiles = profile_dataframe(df)
        assert len(profiles) == len(df.columns)

    def test_column_names_match(self):
        df = self._make_df()
        profiles = profile_dataframe(df)
        names = [p.name for p in profiles]
        assert set(names) == set(df.columns)

    def test_amount_is_continuous(self):
        df = self._make_df()
        profiles = {p.name: p for p in profile_dataframe(df)}
        assert profiles["amount"].col_type == "continuous"

    def test_channel_is_categorical(self):
        df = self._make_df()
        profiles = {p.name: p for p in profile_dataframe(df)}
        assert profiles["channel"].col_type == "categorical"

    def test_is_fraud_is_boolean(self):
        df = self._make_df()
        profiles = {p.name: p for p in profile_dataframe(df)}
        assert profiles["is_fraud"].col_type == "boolean"

    def test_transaction_date_is_datetime(self):
        df = self._make_df()
        profiles = {p.name: p for p in profile_dataframe(df)}
        assert profiles["transaction_date"].col_type == "datetime"

    def test_account_id_is_id(self):
        df = self._make_df()
        profiles = {p.name: p for p in profile_dataframe(df)}
        assert profiles["account_id"].col_type == "id"

    def test_continuous_has_distribution_params(self):
        df = self._make_df()
        profiles = {p.name: p for p in profile_dataframe(df)}
        amount = profiles["amount"]
        assert amount.distribution in ("normal", "lognormal")
        assert len(amount.distribution_params) > 0

    def test_continuous_stats_populated(self):
        df = self._make_df()
        profiles = {p.name: p for p in profile_dataframe(df)}
        stats = profiles["amount"].stats
        assert stats.mean is not None
        assert stats.stddev is not None
        assert stats.min is not None
        assert stats.max is not None

    def test_categorical_frequencies_sum_to_one(self):
        df = self._make_df()
        profiles = {p.name: p for p in profile_dataframe(df)}
        freqs = profiles["channel"].distribution_params.get("frequencies", {})
        assert abs(sum(freqs.values()) - 1.0) < 1e-6

    def test_null_columns_handled_gracefully(self):
        df = pd.DataFrame({"col_a": [None, None, None], "col_b": [1.0, 2.0, 3.0]})
        profiles = profile_dataframe(df)
        assert len(profiles) == 2

    def test_bad_column_falls_back_to_id(self):
        df = pd.DataFrame({"weird": [object(), object(), object()]})
        profiles = profile_dataframe(df)
        assert profiles[0].col_type == "id"
