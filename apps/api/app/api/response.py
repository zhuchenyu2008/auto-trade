from __future__ import annotations

from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.context import get_request_id
from app.core.security import utc_now


def envelope(
    request: Request,
    *,
    data: Any = None,
    error: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "data": data,
        "meta": {
            "request_id": get_request_id(request),
            "server_time": utc_now().isoformat(),
        },
        "error": error,
    }


def success_response(request: Request, data: Any, status_code: int = 200) -> JSONResponse:
    return JSONResponse(status_code=status_code, content=envelope(request, data=data))


def error_response(
    request: Request,
    *,
    code: str,
    message: str,
    status_code: int,
    details: Any | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content=envelope(
            request,
            data=None,
            error={
                "code": code,
                "message": message,
                "details": details,
            },
        ),
    )
