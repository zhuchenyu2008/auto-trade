from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel


class StreamEvent(BaseModel):
    event_id: str
    event_type: str
    occurred_at: datetime
    environment: Literal["paper", "live"] | None = None
    payload: dict[str, Any]
