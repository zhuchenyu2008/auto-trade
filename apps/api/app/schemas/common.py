from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class ApiMeta(BaseModel):
    request_id: str
    server_time: datetime


class ApiError(BaseModel):
    code: str
    message: str
    details: Any | None = None


class ApiEnvelope(BaseModel):
    data: Any | None
    meta: ApiMeta
    error: ApiError | None = None
