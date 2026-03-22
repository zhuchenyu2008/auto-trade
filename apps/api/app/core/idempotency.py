from __future__ import annotations

from fastapi import Request

from app.core.context import IDEMPOTENCY_KEY_HEADER


def get_idempotency_key(request: Request) -> str | None:
    return request.headers.get(IDEMPOTENCY_KEY_HEADER)
