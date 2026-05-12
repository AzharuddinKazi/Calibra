"""Unit tests for backend/engine/sampler.py — ≥80% line coverage."""

import numpy as np
import pandas as pd
import pytest

from backend.engine.profiler import profile_dataframe
from backend.engine.sampler import make_rng, sample_from_profile, sample_from_schema
from backend.models.schemas import ColumnSpec, GenerationConfig


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_profiles():
    rng = np.random.default_rng(0)
    df = pd.DataFrame({
        "amount": rng.lognormal(5, 1, 300),
        "channel": np.random.choice(["online", "atm"], 300),
        "is_fraud": rng.integers(0, 2, 300),
    })
    return profile_dataframe(df)


# ── sample_from_profile ────────────────────────────────────────────────────────

class TestSampleFromProfile:
    def test_returns_correct_row_count(self):
        profiles = _make_profiles()
        rng = make_rng(42)
        df = sample_from_profile(profiles, 100, rng)
        assert len(df) == 100

    def test_returns_all_expected_columns(self):
        profiles = _make_profiles()
        rng = make_rng(42)
        df = sample_from_profile(profiles, 50, rng)
        expected_cols = {p.name for p in profiles}
        assert set(df.columns) == expected_cols

    def test_reproducible_with_same_seed(self):
        profiles = _make_profiles()
        df1 = sample_from_profile(profiles, 50, make_rng(7))
        df2 = sample_from_profile(profiles, 50, make_rng(7))
        pd.testing.assert_frame_equal(df1, df2)

    def test_different_seeds_produce_different_output(self):
        profiles = _make_profiles()
        df1 = sample_from_profile(profiles, 50, make_rng(1))
        df2 = sample_from_profile(profiles, 50, make_rng(2))
        assert not df1["amount"].equals(df2["amount"])

    def test_continuous_values_are_numeric(self):
        profiles = _make_profiles()
        df = sample_from_profile(profiles, 100, make_rng(0))
        assert pd.api.types.is_numeric_dtype(df["amount"])

    def test_boolean_values_are_0_or_1(self):
        profiles = _make_profiles()
        df = sample_from_profile(profiles, 200, make_rng(0))
        assert set(df["is_fraud"].unique()).issubset({0, 1})

    def test_single_row(self):
        profiles = _make_profiles()
        df = sample_from_profile(profiles, 1, make_rng(0))
        assert len(df) == 1

    def test_empty_profiles_returns_empty_df(self):
        df = sample_from_profile([], 10, make_rng(0))
        assert len(df) == 10


# ── sample_from_schema ─────────────────────────────────────────────────────────

class TestSampleFromSchema:
    def _config(self, cols):
        return GenerationConfig(columns=cols)

    def test_returns_correct_row_count(self):
        config = self._config([
            ColumnSpec(name="amount", col_type="continuous", distribution_hint="lognormal"),
        ])
        df = sample_from_schema(config, 100, make_rng(0))
        assert len(df) == 100

    def test_returns_all_schema_columns(self):
        config = self._config([
            ColumnSpec(name="amount", col_type="continuous"),
            ColumnSpec(name="channel", col_type="categorical", sample_values=["online", "atm"]),
            ColumnSpec(name="label", col_type="boolean"),
        ])
        df = sample_from_schema(config, 50, make_rng(0))
        assert set(df.columns) == {"amount", "channel", "label"}

    def test_id_column_generates_unique_strings(self):
        config = self._config([ColumnSpec(name="txn_id", col_type="id")])
        df = sample_from_schema(config, 100, make_rng(0))
        assert df["txn_id"].nunique() == 100

    def test_categorical_values_from_sample_values(self):
        allowed = ["visa", "mastercard", "amex"]
        config = self._config([
            ColumnSpec(name="card_type", col_type="categorical", sample_values=allowed),
        ])
        df = sample_from_schema(config, 200, make_rng(0))
        assert set(df["card_type"].unique()).issubset(set(allowed))

    def test_raises_without_columns(self):
        config = GenerationConfig()
        with pytest.raises(ValueError):
            sample_from_schema(config, 10, make_rng(0))

    def test_all_hint_types_sample_without_error(self):
        for hint in ("normal", "lognormal", "exponential", "uniform"):
            config = self._config([ColumnSpec(name="val", col_type="continuous", distribution_hint=hint)])
            df = sample_from_schema(config, 20, make_rng(0))
            assert len(df) == 20

    def test_datetime_column_returns_strings(self):
        config = self._config([ColumnSpec(name="ts", col_type="datetime")])
        df = sample_from_schema(config, 10, make_rng(0))
        assert df["ts"].dtype == object


# ── Distribution overrides ────────────────────────────────────────────────────

from backend.models.schemas import DistributionOverride


class TestDistributionOverrides:
    def _make_continuous_profiles(self):
        rng = np.random.default_rng(0)
        df = pd.DataFrame({"amount": rng.normal(100, 20, 500)})
        return profile_dataframe(df)

    def _make_categorical_profiles(self):
        df = pd.DataFrame({"channel": np.array(["online"] * 400 + ["atm"] * 100)})
        return profile_dataframe(df)

    def test_normal_override_uses_custom_mean_and_std(self):
        profiles = self._make_continuous_profiles()
        override = DistributionOverride(
            distribution="normal",
            params={"loc": 999.0, "scale": 1.0},
        )
        rng = make_rng(42)
        df = sample_from_profile(profiles, 500, rng, distribution_overrides={"amount": override})
        assert abs(df["amount"].mean() - 999.0) < 5.0

    def test_categorical_override_frequencies_are_respected(self):
        profiles = self._make_categorical_profiles()
        override = DistributionOverride(
            distribution="categorical",
            params={"frequencies": {"online": 0.1, "atm": 0.9}},
        )
        rng = make_rng(42)
        df = sample_from_profile(profiles, 1000, rng, distribution_overrides={"channel": override})
        atm_rate = (df["channel"] == "atm").mean()
        assert atm_rate > 0.80

    def test_columns_without_overrides_are_unaffected(self):
        rng_ref = np.random.default_rng(0)
        full_df = pd.DataFrame({
            "amount": rng_ref.normal(100, 20, 500),
            "channel": np.array(["online"] * 400 + ["atm"] * 100),
        })
        profiles = profile_dataframe(full_df)

        override = DistributionOverride(
            distribution="normal",
            params={"loc": 9999.0, "scale": 0.1},
        )
        rng = make_rng(0)
        df = sample_from_profile(
            profiles, 200, rng, distribution_overrides={"amount": override}
        )
        assert set(df["channel"].unique()).issubset({"online", "atm"})
