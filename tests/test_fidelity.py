"""Unit tests for backend/engine/fidelity.py.

Includes tests against known datasets with expected score ranges.
"""

import numpy as np
import pandas as pd
import pytest

from backend.engine.fidelity import (
    compute_column_js_divergences,
    compute_fidelity,
)
from backend.constants import FIDELITY_WARNING_THRESHOLD


# ── Helpers ───────────────────────────────────────────────────────────────────

def _identical_dfs(n=500):
    rng = np.random.default_rng(0)
    df = pd.DataFrame({
        "amount": rng.lognormal(5, 1, n),
        "age": rng.normal(40, 10, n),
        "channel": np.random.choice(["online", "atm", "branch"], n),
    })
    return df, df.copy()


def _divergent_dfs(n=500):
    rng = np.random.default_rng(0)
    real = pd.DataFrame({
        "amount": rng.lognormal(5, 1, n),
        "age": rng.normal(40, 10, n),
    })
    synth = pd.DataFrame({
        "amount": rng.uniform(0, 1, n),          # completely different distribution
        "age": rng.uniform(0, 1, n),
    })
    return real, synth


# ── Composite score ────────────────────────────────────────────────────────────

class TestComputeFidelity:
    def test_identical_dfs_score_near_one(self):
        real, synth = _identical_dfs()
        scores = compute_fidelity(real, synth)
        assert scores.composite >= 0.90

    def test_divergent_dfs_score_below_threshold(self):
        real, synth = _divergent_dfs()
        scores = compute_fidelity(real, synth)
        assert scores.composite < FIDELITY_WARNING_THRESHOLD

    def test_composite_within_zero_one(self):
        real, synth = _divergent_dfs()
        scores = compute_fidelity(real, synth)
        assert 0.0 <= scores.composite <= 1.0

    def test_column_fidelity_within_zero_one(self):
        real, synth = _divergent_dfs()
        scores = compute_fidelity(real, synth)
        assert 0.0 <= scores.column_fidelity <= 1.0

    def test_correlation_fidelity_within_zero_one(self):
        real, synth = _divergent_dfs()
        scores = compute_fidelity(real, synth)
        assert 0.0 <= scores.correlation_fidelity <= 1.0

    def test_weights_sum_applied_correctly(self):
        real, synth = _identical_dfs()
        scores = compute_fidelity(real, synth)
        expected = 0.6 * scores.column_fidelity + 0.4 * scores.correlation_fidelity
        assert scores.composite == pytest.approx(expected, abs=1e-4)

    def test_no_shared_columns_returns_scores(self):
        real = pd.DataFrame({"a": [1.0, 2.0, 3.0]})
        synth = pd.DataFrame({"b": [1.0, 2.0, 3.0]})
        scores = compute_fidelity(real, synth)
        assert 0.0 <= scores.composite <= 1.0

    def test_single_column_df(self):
        rng = np.random.default_rng(1)
        real = pd.DataFrame({"x": rng.normal(0, 1, 200)})
        synth = pd.DataFrame({"x": rng.normal(0, 1, 200)})
        scores = compute_fidelity(real, synth)
        assert scores.composite >= 0.0

    def test_mixed_categorical_and_numeric(self):
        rng = np.random.default_rng(0)
        real = pd.DataFrame({
            "amount": rng.lognormal(5, 1, 300),
            "channel": np.random.choice(["A", "B", "C"], 300),
        })
        synth = pd.DataFrame({
            "amount": rng.lognormal(5, 1, 300),
            "channel": np.random.choice(["A", "B", "C"], 300),
        })
        scores = compute_fidelity(real, synth)
        assert scores.composite >= 0.5

    def test_known_score_range(self):
        """Regression: similar distributions should score above 0.75."""
        rng = np.random.default_rng(42)
        real = pd.DataFrame({
            "amount": rng.lognormal(5, 1, 1000),
            "age": rng.normal(35, 8, 1000),
            "score": rng.uniform(0, 1, 1000),
        })
        synth = pd.DataFrame({
            "amount": rng.lognormal(5.02, 1.01, 1000),
            "age": rng.normal(35.1, 8.1, 1000),
            "score": rng.uniform(0, 1, 1000),
        })
        scores = compute_fidelity(real, synth)
        assert scores.composite >= FIDELITY_WARNING_THRESHOLD


# ── Per-column JS divergences ─────────────────────────────────────────────────

class TestComputeColumnJsDivergences:
    def test_returns_dict_keyed_by_column_name(self):
        real, synth = _identical_dfs()
        result = compute_column_js_divergences(real, synth)
        assert set(result.keys()) == {"amount", "age", "channel"}

    def test_identical_columns_have_low_divergence(self):
        real, synth = _identical_dfs()
        result = compute_column_js_divergences(real, synth)
        for val in result.values():
            assert val < 0.1

    def test_divergent_columns_have_high_divergence(self):
        real, synth = _divergent_dfs()
        result = compute_column_js_divergences(real, synth)
        assert any(v > 0.3 for v in result.values())

    def test_values_within_zero_one(self):
        real, synth = _divergent_dfs()
        result = compute_column_js_divergences(real, synth)
        for v in result.values():
            assert 0.0 <= v <= 1.0

    def test_missing_column_excluded(self):
        real = pd.DataFrame({"a": [1.0, 2.0], "b": [3.0, 4.0]})
        synth = pd.DataFrame({"a": [1.0, 2.0]})
        result = compute_column_js_divergences(real, synth)
        assert "b" not in result
        assert "a" in result
