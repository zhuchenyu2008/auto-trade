from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class LogItemResponse(BaseModel):
    log_id: str
    timestamp: datetime
    level: Literal["debug", "info", "warning", "error"]
    module: str
    environment: Literal["paper", "live"]
    channel_id: str | None = None
    channel_name: str | None = None
    message: str
    correlation_id: str


class CursorPage(BaseModel):
    next_cursor: str | None = None
    has_more: bool


class LogsResponse(BaseModel):
    items: list[LogItemResponse]
    page: CursorPage
