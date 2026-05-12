"""Tests for fraud and AML domain packs.

Every active constraint must have at least one passing-row test and one
failing-row test.  No engine calls, no LLM calls.
"""

import pytest

from backend.domain_packs.aml import AMLDomainPack, get_domain_pack
from backend.domain_packs.fraud import FraudDomainPack
from backend.engine.validator import validate_row


# ── Fraud pack ────────────────────────────────────────────────────────────────

class TestFraudDomainPack:
    def setup_method(self):
        self.pack = FraudDomainPack()

    def test_name_and_version(self):
        assert self.pack.name == "fraud"
        assert self.pack.version == "1.0"

    def test_returns_constraints(self):
        constraints = self.pack.get_constraints({})
        assert isinstance(constraints, list)
        assert len(constraints) >= 1

    def test_amount_bound_passes(self):
        constraints = self.pack.get_constraints({"instrument": "default"})
        row = {"amount": 500.0}
        assert validate_row(row, constraints)

    def test_amount_bound_fails_below_min(self):
        constraints = self.pack.get_constraints({"instrument": "default"})
        row = {"amount": 0.0}
        assert not validate_row(row, constraints)

    def test_amount_bound_fails_above_max(self):
        constraints = self.pack.get_constraints({"instrument": "default"})
        row = {"amount": 200_000.0}
        assert not validate_row(row, constraints)

    def test_card_present_instrument_bounds(self):
        constraints = self.pack.get_constraints({"instrument": "card_present"})
        passing = {"amount": 5_000.0}
        failing = {"amount": 20_000.0}
        assert validate_row(passing, constraints)
        assert not validate_row(failing, constraints)

    def test_card_not_present_typology_constraint(self):
        constraints = self.pack.get_constraints({"typologies": ["card_not_present"]})
        passing = {"amount": 100.0}
        failing = {"amount": 60_000.0}
        assert validate_row(passing, constraints)
        assert not validate_row(failing, constraints)

    def test_first_party_fraud_relational_passes(self):
        constraints = self.pack.get_constraints({"typologies": ["first_party_fraud"]})
        row = {"amount": 200.0, "account_balance": 1_000.0}
        assert validate_row(row, constraints)

    def test_first_party_fraud_relational_fails(self):
        constraints = self.pack.get_constraints({"typologies": ["first_party_fraud"]})
        row = {"amount": 2_000.0, "account_balance": 1_000.0}
        assert not validate_row(row, constraints)

    def test_synthetic_identity_age_passes(self):
        constraints = self.pack.get_constraints({"typologies": ["synthetic_identity"]})
        row = {"amount": 50.0, "account_age_days": 30}
        assert validate_row(row, constraints)

    def test_synthetic_identity_age_fails(self):
        constraints = self.pack.get_constraints({"typologies": ["synthetic_identity"]})
        row = {"amount": 50.0, "account_age_days": -1}
        assert not validate_row(row, constraints)

    def test_all_typologies_combined(self):
        constraints = self.pack.get_constraints({
            "typologies": ["card_not_present", "first_party_fraud", "synthetic_identity"],
            "instrument": "card_not_present",
        })
        assert len(constraints) >= 3

    # Prevalence

    def test_prevalence_default(self):
        config = self.pack.get_prevalence_config({})
        assert abs(sum(config.targets.values()) - 1.0) < 1e-6
        assert config.targets["fraud"] == pytest.approx(0.02, abs=1e-4)

    def test_prevalence_custom_rate(self):
        config = self.pack.get_prevalence_config({"fraud_rate": 0.05})
        assert config.targets["fraud"] == pytest.approx(0.05, abs=1e-4)
        assert config.targets["non_fraud"] == pytest.approx(0.95, abs=1e-4)

    def test_prevalence_clamps_below_min(self):
        config = self.pack.get_prevalence_config({"fraud_rate": 0.0})
        assert config.targets["fraud"] >= 0.001

    def test_prevalence_clamps_above_max(self):
        config = self.pack.get_prevalence_config({"fraud_rate": 0.99})
        assert config.targets["fraud"] <= 0.5

    # UI schema

    def test_ui_schema_is_valid_json_schema(self):
        schema = self.pack.get_ui_schema()
        assert schema["type"] == "object"
        assert "typologies" in schema["properties"]
        assert "fraud_rate" in schema["properties"]


# ── AML pack ──────────────────────────────────────────────────────────────────

class TestAMLDomainPack:
    def setup_method(self):
        self.pack = AMLDomainPack()

    def test_name_and_version(self):
        assert self.pack.name == "aml"
        assert self.pack.version == "1.0"

    def test_amount_bound_passes(self):
        constraints = self.pack.get_constraints({})
        row = {"amount": 500.0}
        assert validate_row(row, constraints)

    def test_amount_bound_fails_zero(self):
        constraints = self.pack.get_constraints({})
        row = {"amount": 0.0}
        assert not validate_row(row, constraints)

    def test_temporal_constraint_passes(self):
        constraints = self.pack.get_constraints({})
        row = {
            "amount": 100.0,
            "transaction_date": "2024-01-01",
            "value_date": "2024-01-02",
        }
        assert validate_row(row, constraints)

    def test_temporal_constraint_fails_reversed_dates(self):
        constraints = self.pack.get_constraints({})
        row = {
            "amount": 100.0,
            "transaction_date": "2024-01-05",
            "value_date": "2024-01-01",
        }
        assert not validate_row(row, constraints)

    def test_structuring_passes(self):
        constraints = self.pack.get_constraints({"typologies": ["structuring"]})
        row = {"amount": 5_000.0, "transaction_date": "2024-01-01", "value_date": "2024-01-02"}
        assert validate_row(row, constraints)

    def test_structuring_fails_above_threshold(self):
        constraints = self.pack.get_constraints({"typologies": ["structuring"]})
        row = {"amount": 10_001.0, "transaction_date": "2024-01-01", "value_date": "2024-01-02"}
        assert not validate_row(row, constraints)

    def test_structuring_fails_below_min(self):
        constraints = self.pack.get_constraints({"typologies": ["structuring"]})
        row = {"amount": 500.0, "transaction_date": "2024-01-01", "value_date": "2024-01-02"}
        assert not validate_row(row, constraints)

    def test_scatter_gather_relational_passes(self):
        constraints = self.pack.get_constraints({"typologies": ["scatter_gather"]})
        row = {"amount": 100.0, "scatter_amount": 500.0, "gather_amount": 500.0}
        assert validate_row(row, constraints)

    def test_scatter_gather_relational_fails(self):
        constraints = self.pack.get_constraints({"typologies": ["scatter_gather"]})
        row = {"amount": 100.0, "scatter_amount": 800.0, "gather_amount": 500.0}
        assert not validate_row(row, constraints)

    # Prevalence

    def test_prevalence_default(self):
        config = self.pack.get_prevalence_config({})
        assert abs(sum(config.targets.values()) - 1.0) < 1e-6
        assert config.targets["suspicious"] == pytest.approx(0.005, abs=1e-4)

    def test_prevalence_custom_sar_rate(self):
        config = self.pack.get_prevalence_config({"sar_rate": 0.01})
        assert config.targets["suspicious"] == pytest.approx(0.01, abs=1e-4)

    def test_prevalence_sums_to_one(self):
        config = self.pack.get_prevalence_config({"sar_rate": 0.03})
        assert abs(sum(config.targets.values()) - 1.0) < 1e-6

    # UI schema

    def test_ui_schema_has_typologies(self):
        schema = self.pack.get_ui_schema()
        assert "typologies" in schema["properties"]
        enums = schema["properties"]["typologies"]["items"]["enum"]
        assert "structuring" in enums
        assert "circular_flow" in enums

    def test_ui_schema_has_sar_rate(self):
        schema = self.pack.get_ui_schema()
        assert "sar_rate" in schema["properties"]


# ── Registry ──────────────────────────────────────────────────────────────────

class TestDomainPackRegistry:
    def test_get_fraud_pack(self):
        pack = get_domain_pack("fraud")
        assert pack is not None
        assert pack.name == "fraud"

    def test_get_aml_pack(self):
        pack = get_domain_pack("aml")
        assert pack is not None
        assert pack.name == "aml"

    def test_get_unknown_pack_returns_none(self):
        assert get_domain_pack("healthcare") is None
