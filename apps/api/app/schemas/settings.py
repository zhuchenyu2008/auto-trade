from __future__ import annotations

from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class CapitalRange(BaseModel):
    min: str
    max: str


class RuntimeSettingsResponse(BaseModel):
    environment: Literal["paper", "live"]
    global_trading_enabled: bool
    model: str
    reasoning_level: Literal["low", "medium", "high"]
    default_leverage: str
    manual_confirmation_threshold: str
    context_window_size: int
    new_position_capital_range: CapitalRange
    updated_at: datetime


class RuntimeSettingsUpdateRequest(BaseModel):
    environment: Literal["paper", "live"]
    global_trading_enabled: bool
    model: str = Field(min_length=1, max_length=128)
    reasoning_level: Literal["low", "medium", "high"]
    default_leverage: str = Field(min_length=1, max_length=32)
    manual_confirmation_threshold: str = Field(min_length=1, max_length=32)
    context_window_size: int = Field(ge=1, le=128)
    new_position_capital_range: CapitalRange

    @model_validator(mode="after")
    def validate_range(self) -> "RuntimeSettingsUpdateRequest":
        try:
            min_value = Decimal(self.new_position_capital_range.min)
            max_value = Decimal(self.new_position_capital_range.max)
        except InvalidOperation as exc:
            raise ValueError("new_position_capital_range must be decimal-like strings") from exc

        if min_value <= 0 or max_value <= 0:
            raise ValueError("new_position_capital_range values must be positive")
        if min_value > max_value:
            raise ValueError("new_position_capital_range.min cannot exceed max")
        return self
