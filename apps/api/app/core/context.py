from __future__ import annotations

from dataclasses import dataclass
from uuid import uuid4

from fastapi import Request

REQUEST_ID_HEADER = "X-Request-Id"
CORRELATION_ID_HEADER = "X-Correlation-Id"
OPERATOR_SOURCE_HEADER = "X-Operator-Source"
IDEMPOTENCY_KEY_HEADER = "X-Idempotency-Key"
AUDIT_ACTION_HEADER = "X-Audit-Action"
AUDIT_TARGET_HEADER = "X-Audit-Target"

REQUEST_ID_STATE = "request_id"
CORRELATION_ID_STATE = "correlation_id"


@dataclass(slots=True)
class RequestContext:
    request_id: str
    correlation_id: str
    operator_source: str
    idempotency_key: str | None
    audit_action: str | None
    audit_target: str | None


def create_request_id() -> str:
    return f"req_{uuid4().hex}"


def create_correlation_id() -> str:
    return f"corr_{uuid4().hex}"


def get_request_id(request: Request) -> str:
    return getattr(request.state, REQUEST_ID_STATE, create_request_id())


def get_correlation_id(request: Request) -> str:
    return getattr(request.state, CORRELATION_ID_STATE, get_request_id(request))


def get_request_context(request: Request) -> RequestContext:
    request_id = get_request_id(request)
    correlation_id = get_correlation_id(request)
    headers = request.headers
    operator_source = headers.get(OPERATOR_SOURCE_HEADER, "unknown")
    idempotency_key = headers.get(IDEMPOTENCY_KEY_HEADER)
    audit_action = headers.get(AUDIT_ACTION_HEADER)
    audit_target = headers.get(AUDIT_TARGET_HEADER)
    return RequestContext(
        request_id=request_id,
        correlation_id=correlation_id,
        operator_source=operator_source,
        idempotency_key=idempotency_key,
        audit_action=audit_action,
        audit_target=audit_target,
    )
