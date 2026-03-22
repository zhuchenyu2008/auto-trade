from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: Literal["dev", "test", "prod"] = "dev"
    app_name: str = "auto-trade-api"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    api_prefix: str = "/api/v1"

    postgres_dsn: str = Field(alias="POSTGRES_DSN")
    redis_url: str = Field(alias="REDIS_URL")
    owner_password_hash: SecretStr = Field(alias="OWNER_PASSWORD_HASH")

    session_cookie_name: str = "auto_trade_session"
    session_ttl_minutes: int = 120
    session_secure_cookie: bool = False
    session_samesite: Literal["lax", "strict", "none"] = "lax"

    login_rate_limit_max_requests: int = 20
    login_rate_limit_window_seconds: int = 60
    login_lock_threshold: int = 5
    login_lock_duration_seconds: int = 900

    cors_origins: str = "http://localhost:5173"
    auto_create_schema: bool = True
    sse_heartbeat_seconds: int = 10

    runtime_default_environment: Literal["paper", "live"] = "paper"
    runtime_default_global_trading_enabled: bool = True
    runtime_default_model: str = "gpt-5.4"
    runtime_default_reasoning_level: Literal["low", "medium", "high"] = "medium"
    runtime_default_default_leverage: str = "25"
    runtime_default_manual_confirmation_threshold: str = "0.66"
    runtime_default_context_window_size: int = 8
    runtime_default_new_position_capital_min: str = "0.40"
    runtime_default_new_position_capital_max: str = "0.80"

    @field_validator("owner_password_hash")
    @classmethod
    def validate_password_hash(cls, value: SecretStr) -> SecretStr:
        raw = value.get_secret_value().strip()
        if not raw or raw == "REPLACE_WITH_ARGON2_HASH":
            raise ValueError("OWNER_PASSWORD_HASH must be configured with a real Argon2 hash.")
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        items = [item.strip() for item in self.cors_origins.split(",")]
        return [item for item in items if item]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
