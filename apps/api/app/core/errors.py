from __future__ import annotations

from dataclasses import dataclass
from http import HTTPStatus
from typing import Any


@dataclass(slots=True)
class AppError(Exception):
    code: str
    message: str
    status_code: int = HTTPStatus.BAD_REQUEST
    details: Any | None = None

    def __str__(self) -> str:
        return f"{self.code}: {self.message}"


class ErrorCodes:
    UNAUTHORIZED = "UNAUTHORIZED"
    AUTH_INVALID_PASSWORD = "AUTH_INVALID_PASSWORD"
    AUTH_ACCOUNT_LOCKED = "AUTH_ACCOUNT_LOCKED"
    AUTH_RATE_LIMITED = "AUTH_RATE_LIMITED"
    AUTH_SESSION_EXPIRED = "AUTH_SESSION_EXPIRED"

    SETTINGS_VALIDATION_ERROR = "SETTINGS_VALIDATION_ERROR"
    SETTINGS_CONFLICT = "SETTINGS_CONFLICT"
    SETTINGS_FORBIDDEN_FIELD = "SETTINGS_FORBIDDEN_FIELD"

    LOGS_INVALID_QUERY = "LOGS_INVALID_QUERY"
    SSE_NOT_AVAILABLE = "SSE_NOT_AVAILABLE"
    SSE_UNAUTHORIZED = "SSE_UNAUTHORIZED"

    DEPENDENCY_UNAVAILABLE = "DEPENDENCY_UNAVAILABLE"
    INTERNAL_ERROR = "INTERNAL_ERROR"
