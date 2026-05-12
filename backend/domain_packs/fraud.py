"""Financial crime — Fraud Detection domain pack."""

from __future__ import annotations

from backend.domain_packs.base import BaseDomainPack
from backend.models.schemas import Constraint, PrevalenceConfig


class FraudDomainPack(BaseDomainPack):
    name = "fraud"
    version = "1.0"

    # Amount bounds per instrument type (USD)
    _AMOUNT_BOUNDS = {
        "card_present": {"min": 0.01, "max": 15_000.0},
        "card_not_present": {"min": 0.01, "max": 50_000.0},
        "atm": {"min": 20.0, "max": 3_000.0},
        "default": {"min": 0.01, "max": 100_000.0},
    }

    # Default prevalence by typology (fraction of total rows that are fraud)
    _DEFAULT_FRAUD_RATE = 0.02

    def get_constraints(self, user_config: dict) -> list[Constraint]:
        """Return constraints based on selected typologies and user config."""
        constraints: list[Constraint] = []
        typologies: list[str] = user_config.get("typologies", [])
        instrument: str = user_config.get("instrument", "default")
        bounds = self._AMOUNT_BOUNDS.get(instrument, self._AMOUNT_BOUNDS["default"])

        # Universal: transaction amount must be positive and within instrument bounds
        constraints.append(Constraint(
            rule_type="bound",
            column="amount",
            params={"min": bounds["min"], "max": bounds["max"]},
            readable_summary=f"Transaction amount between {bounds['min']} and {bounds['max']}",
            source="domain_pack",
        ))

        # ATM: amounts must be round multiples of 20
        if instrument == "atm":
            constraints.append(Constraint(
                rule_type="conditional",
                column="amount",
                params={
                    "if_column": "channel",
                    "if_value": "atm",
                    "then_column": "amount",
                    "modulo": 20,
                    "modulo_result": 0,
                },
                readable_summary="ATM withdrawals must be multiples of 20",
                source="domain_pack",
            ))

        # Card-not-present typology: no physical merchant required
        if "card_not_present" in typologies:
            constraints.append(Constraint(
                rule_type="bound",
                column="amount",
                params={"min": 0.01, "max": 50_000.0},
                readable_summary="Card-not-present amount ceiling 50,000",
                source="domain_pack",
            ))

        # Account takeover: velocity — max 5 transactions per account per hour
        if "account_takeover" in typologies:
            constraints.append(Constraint(
                rule_type="temporal",
                columns=["event_time", "account_id"],
                params={
                    "rule": "velocity",
                    "window_seconds": 3600,
                    "max_count": 5,
                    "group_by": "account_id",
                },
                readable_summary="Max 5 transactions per account per hour (account takeover pattern)",
                source="domain_pack",
            ))

        # Synthetic identity: age of account must be positive if present
        if "synthetic_identity" in typologies:
            constraints.append(Constraint(
                rule_type="bound",
                column="account_age_days",
                params={"min": 0},
                readable_summary="Account age must be non-negative",
                source="domain_pack",
            ))

        # First-party fraud: transaction amount <= account balance if balance present
        if "first_party_fraud" in typologies:
            constraints.append(Constraint(
                rule_type="relational",
                columns=["amount", "account_balance"],
                params={"operator": "<="},
                readable_summary="Transaction amount must not exceed account balance",
                source="domain_pack",
            ))

        return constraints

    def get_prevalence_config(self, user_config: dict) -> PrevalenceConfig:
        fraud_rate = float(user_config.get("fraud_rate", self._DEFAULT_FRAUD_RATE))
        fraud_rate = max(0.001, min(fraud_rate, 0.5))
        return PrevalenceConfig(targets={
            "fraud": round(fraud_rate, 4),
            "non_fraud": round(1.0 - fraud_rate, 4),
        })

    def get_ui_schema(self) -> dict:
        return {
            "type": "object",
            "title": "Fraud Detection Configuration",
            "properties": {
                "typologies": {
                    "type": "array",
                    "title": "Fraud Typologies",
                    "items": {
                        "type": "string",
                        "enum": [
                            "card_not_present",
                            "account_takeover",
                            "synthetic_identity",
                            "first_party_fraud",
                        ],
                    },
                    "default": ["card_not_present"],
                },
                "instrument": {
                    "type": "string",
                    "title": "Payment Instrument",
                    "enum": ["card_present", "card_not_present", "atm", "default"],
                    "default": "default",
                },
                "fraud_rate": {
                    "type": "number",
                    "title": "Target Fraud Rate",
                    "minimum": 0.001,
                    "maximum": 0.5,
                    "default": 0.02,
                    "description": "Fraction of rows labelled as fraud (e.g. 0.02 = 2%)",
                },
            },
        }
