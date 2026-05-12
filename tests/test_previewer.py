"""Unit tests for backend/engine/previewer.py.

Tests: histogram bin count, KDE output shape, correlation matrix symmetry,
sample row count, agent-first (no real data) handling.
"""

import numpy as np
import pandas as pd
import pytest

from backend.constants import HISTOGRAM_BINS, KDE_POINTS, SAMPLE_TABLE_ROWS
from backend.engine.previewer import build_preview


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_dfs(n=300):
    rng = np.random.default_rng(0)
    real = pd.DataFrame({
        "amount": rng.lognormal(5, 1, n),
        "age": rng.normal(40, 8, n),
        "channel": np.random.choice(["online", "atm"], n),
        "is_fraud": rng.integers(0, 2, n),
    })
    synth = pd.DataFrame({
        "amount": rng.lognormal(5.1, 1, n),
        "age": rng.normal(40, 8, n),
        "channel": np.random.choice(["online", "atm"], n),
        "is_fraud": rng.integers(0, 2, n),
    })
    return real, synth


# ── Build preview ─────────────────────────────────────────────────────────────

class TestBuildPreview:
    def test_returns_correct_run_id(self):
        real, synth = _make_dfs()
        preview = build_preview("run_abc", real, synth)
        assert preview.run_id == "run_abc"

    def test_columns_count_matches_df(self):
        real, synth = _make_dfs()
        preview = build_preview("r1", real, synth)
        assert len(preview.columns) == len(synth.columns)

    def test_fidelity_scores_populated(self):
        real, synth = _make_dfs()
        preview = build_preview("r1", real, synth)
        assert preview.fidelity.composite >= 0.0
        assert preview.fidelity.column_fidelity >= 0.0
        assert preview.fidelity.correlation_fidelity >= 0.0

    def test_sample_rows_count(self):
        real, synth = _make_dfs(400)
        preview = build_preview("r1", real, synth)
        assert len(preview.sample_rows) == SAMPLE_TABLE_ROWS

    def test_sample_rows_fewer_than_limit(self):
        rng = np.random.default_rng(0)
        small = pd.DataFrame({"amount": rng.normal(0, 1, 10)})
        preview = build_preview("r1", small, small)
        assert len(preview.sample_rows) == 10

    def test_agent_first_no_real_data(self):
        rng = np.random.default_rng(0)
        synth = pd.DataFrame({"amount": rng.lognormal(5, 1, 100)})
        preview = build_preview("r1", None, synth)
        assert preview.fidelity.composite == 0.0
        assert len(preview.columns) == 1

    def test_prevalence_populated_when_provided(self):
        real, synth = _make_dfs()
        preview = build_preview(
            "r1", real, synth,
            prevalence_targets={"fraud": 0.02, "non_fraud": 0.98},
            prevalence_actuals={"fraud": 0.019, "non_fraud": 0.981},
        )
        assert preview.prevalence is not None
        assert preview.prevalence.target["fraud"] == pytest.approx(0.02)

    def test_prevalence_none_when_not_provided(self):
        real, synth = _make_dfs()
        preview = build_preview("r1", real, synth)
        assert preview.prevalence is None


# ── Histograms ────────────────────────────────────────────────────────────────

class TestHistograms:
    def test_continuous_histogram_bin_count(self):
        real, synth = _make_dfs()
        preview = build_preview("r1", real, synth)
        amount_col = next(c for c in preview.columns if c.name == "amount")
        # bins has HISTOGRAM_BINS+1 edges, counts has HISTOGRAM_BINS values
        assert len(amount_col.synthetic.histogram.counts) == HISTOGRAM_BINS
        assert len(amount_col.synthetic.histogram.bins) == HISTOGRAM_BINS + 1

    def test_categorical_histogram_has_counts(self):
        real, synth = _make_dfs()
        preview = build_preview("r1", real, synth)
        channel_col = next(c for c in preview.columns if c.name == "channel")
        assert len(channel_col.synthetic.histogram.counts) > 0

    def test_histogram_counts_are_non_negative(self):
        real, synth = _make_dfs()
        preview = build_preview("r1", real, synth)
        for col in preview.columns:
            for count in col.synthetic.histogram.counts:
                assert count >= 0


# ── KDE ───────────────────────────────────────────────────────────────────────

class TestKDE:
    def test_continuous_kde_has_correct_point_count(self):
        real, synth = _make_dfs()
        preview = build_preview("r1", real, synth)
        amount_col = next(c for c in preview.columns if c.name == "amount")
        assert amount_col.synthetic.kde is not None
        assert len(amount_col.synthetic.kde.x) == KDE_POINTS
        assert len(amount_col.synthetic.kde.y) == KDE_POINTS

    def test_categorical_column_has_no_kde(self):
        real, synth = _make_dfs()
        preview = build_preview("r1", real, synth)
        channel_col = next(c for c in preview.columns if c.name == "channel")
        assert channel_col.synthetic.kde is None

    def test_kde_y_values_are_non_negative(self):
        real, synth = _make_dfs()
        preview = build_preview("r1", real, synth)
        amount_col = next(c for c in preview.columns if c.name == "amount")
        assert all(y >= 0 for y in amount_col.synthetic.kde.y)


# ── Correlation matrix ────────────────────────────────────────────────────────

class TestCorrelationMatrix:
    def test_correlation_is_not_none_for_numeric_df(self):
        real, synth = _make_dfs()
        preview = build_preview("r1", real, synth)
        assert preview.correlation is not None

    def test_correlation_matrix_is_square(self):
        real, synth = _make_dfs()
        preview = build_preview("r1", real, synth)
        matrix = preview.correlation.real
        n = len(matrix)
        assert all(len(row) == n for row in matrix)

    def test_correlation_matrix_is_symmetric(self):
        real, synth = _make_dfs()
        preview = build_preview("r1", real, synth)
        matrix = np.array(preview.correlation.real)
        assert matrix == pytest.approx(matrix.T, abs=1e-6)

    def test_correlation_diagonal_is_one(self):
        real, synth = _make_dfs()
        preview = build_preview("r1", real, synth)
        matrix = np.array(preview.correlation.real)
        for i in range(len(matrix)):
            assert matrix[i][i] == pytest.approx(1.0, abs=1e-6)

    def test_single_numeric_column_returns_none_correlation(self):
        rng = np.random.default_rng(0)
        df = pd.DataFrame({"amount": rng.normal(0, 1, 100)})
        preview = build_preview("r1", df, df)
        assert preview.correlation is None

    def test_no_real_data_uses_synth_for_both_matrices(self):
        rng = np.random.default_rng(0)
        synth = pd.DataFrame({
            "a": rng.normal(0, 1, 100),
            "b": rng.normal(0, 1, 100),
        })
        preview = build_preview("r1", None, synth)
        assert preview.correlation is not None
        assert preview.correlation.real == preview.correlation.synthetic
