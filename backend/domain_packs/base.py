"""Abstract base class for all Calibra domain packs."""

from __future__ import annotations

from abc import ABC, abstractmethod

from backend.models.schemas import Constraint, PrevalenceConfig


class BaseDomainPack(ABC):
    """Every domain pack must implement these three methods.

    The UI schema drives the frontend config form dynamically — adding a new
    pack requires no frontend changes, only this class + registration.
    """

    name: str = ""
    version: str = "1.0"

    @abstractmethod
    def get_constraints(self, user_config: dict) -> list[Constraint]:
        """Return the list of active Constraint objects for the given config."""
        raise NotImplementedError

    @abstractmethod
    def get_prevalence_config(self, user_config: dict) -> PrevalenceConfig:
        """Return prevalence targets per label class."""
        raise NotImplementedError

    @abstractmethod
    def get_ui_schema(self) -> dict:
        """Return a JSON Schema dict that drives the frontend config form."""
        raise NotImplementedError
