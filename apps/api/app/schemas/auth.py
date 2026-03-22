from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    password: str = Field(min_length=6, max_length=6)


class SessionResponse(BaseModel):
    user_label: str = "owner"
    authenticated: bool = True
    environment: Literal["paper", "live"]
    global_trading_enabled: bool
    health_status: Literal["healthy", "degraded", "down"] = "healthy"
    pending_manual_confirmation_count: int = 0
    session_expires_at: datetime | None = None


class LogoutResponse(BaseModel):
    success: bool = True
