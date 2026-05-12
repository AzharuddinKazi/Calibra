"""Financial crime — AML Transaction Monitoring domain pack."""

from __future__ import annotations

from backend.domain_packs.base import BaseDomainPack
from backend.models.schemas import Constraint, PrevalenceConfig


class AMLDomainPack(BaseDomainPack):
    name = "aml"
    version = "1.0"

    _DEFAULT_SAR_RATE = 0.005   # 0.5% of transactions flagged suspicious

    def get_constraints(self, user_config: dict) -> list[Constraint]:
        """Return constraints based on selected AML typologies."""
        constraints: list[Constraint] = []
        typologies: list[str] = user_config.get("typologies", [])

        # Universal: transaction amount must be positive
        constraints.append(Constraint(
            rule_type="bound",
            column="amount",
            params={"min": 0.01},
            readable_summary="Transaction amount must be positive",
            source="domain_pack",
        ))

        # Universal: transaction timestamp must precede any settlement/value date
        constraints.append(Constraint(
            rule_type="temporal",
            columns=["transaction_date", "value_date"],
            params={"before_column": "transaction_date", "after_column": "value_date"},
            readable_summary="Transaction date must be on or before value date",
            source="domain_pack",
        ))

        # Structuring: individual transactions kept just below reporting threshold
        if "structuring" in typologies:
            constraints.append(Constraint(
                rule_type="bound",
                column="amount",
                params={"min": 1_000.0, "max": 9_999.99},
                readable_summary="Structuring amounts between 1,000 and 9,999.99 (below CTR threshold)",
                source="domain_pack",
            ))

        # Fan-out: one source account, many destination accounts
        if "fan_out" in typologies:
            constraints.append(Constraint(
                rule_type="bound",
                column="amount",
                params={"min": 100.0, "max": 50_000.0},
                readable_summary="Fan-out transaction amounts between 100 and 50,000",
                source="domain_pack",
            ))

        # Fan-in: many source accounts, one destination
        if "fan_in" in typologies:
            constraints.append(Constraint(
                rule_type="bound",
                column="amount",
                params={"min": 100.0, "max": 50_000.0},
                readable_summary="Fan-in transaction amounts between 100 and 50,000",
                source="domain_pack",
            ))

        # Scatter-gather: funds dispersed then consolidated
        if "scatter_gather" in typologies:
            constraints.append(Constraint(
                rule_type="relational",
                columns=["scatter_amount", "gather_amount"],
                params={"operator": "<="},
                readable_summary="Scatter amount must not exceed gather amount (round-trip integrity)",
                source="domain_pack",
            ))

        # Circular flow: transaction must not originate and terminate at same account
        if "circular_flow" in typologies:
            constraints.append(Constraint(
                rule_type="conditional",
                column="sender_account",
                params={
                    "if_column": "sender_account",
                    "if_value": "__same_as_receiver__",
                    "then_column": "amount",
                    "then_max": -1,   # impossible value — enforces no same-account transfers
                },
                readable_summary="Circular flow: sender and receiver accounts must differ",
                source="domain_pack",
            ))

        return constraints

    def get_prevalence_config(self, user_config: dict) -> PrevalenceConfig:
        sar_rate = float(user_config.get("sar_rate", self._DEFAULT_SAR_RATE))
        sar_rate = max(0.001, min(sar_rate, 0.3))
        return PrevalenceConfig(targets={
            "suspicious": round(sar_rate, 4),
            "non_suspicious": round(1.0 - sar_rate, 4),
        })

    def get_ui_schema(self) -> dict:
        return {
            "type": "object",
            "title": "AML Transaction Monitoring Configuration",
            "properties": {
                "typologies": {
                    "type": "array",
                    "title": "AML Typologies",
                    "items": {
                        "type": "string",
                        "enum": [
                            "structuring",
                            "fan_out",
                            "fan_in",
                            "scatter_gather",
                            "circular_flow",
                        ],
                    },
                    "default": ["structuring"],
                },
                "sar_rate": {
                    "type": "number",
                    "title": "Target SAR Rate",
                    "minimum": 0.001,
                    "maximum": 0.3,
                    "default": 0.005,
                    "description": "Fraction of rows flagged as suspicious activity (e.g. 0.005 = 0.5%)",
                },
            },
        }


# ── Pack registry ─────────────────────────────────────────────────────────────

from backend.domain_packs.fraud import FraudDomainPack  # noqa: E402

DOMAIN_PACK_REGISTRY: dict[str, BaseDomainPack] = {
    "fraud": FraudDomainPack(),
    "aml": AMLDomainPack(),
}


def get_domain_pack(name: str) -> BaseDomainPack | None:
    """Return an instantiated domain pack by name, or None if not found."""
    return DOMAIN_PACK_REGISTRY.get(name)
