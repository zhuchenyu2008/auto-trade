from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import uuid4

from app.core.security import utc_now
from app.realtime.sse_hub import SSEHub


class EventsService:
    def __init__(self, hub: SSEHub) -> None:
        self._hub = hub

    @staticmethod
    def _build_event(
        *,
        event_type: str,
        payload: dict[str, Any],
        occurred_at: datetime,
        environment: str | None = None,
    ) -> dict[str, Any]:
        event: dict[str, Any] = {
            "event_id": f"evt_{uuid4().hex[:18]}",
            "event_type": event_type,
            "occurred_at": occurred_at.isoformat(),
            "payload": payload,
        }
        if environment is not None:
            event["environment"] = environment
        return event

    async def publish_log_created(self, payload: dict[str, Any], occurred_at: datetime) -> None:
        event = self._build_event(
            event_type="log.appended",
            payload=payload,
            occurred_at=occurred_at,
            environment=payload.get("environment"),
        )
        await self._hub.publish(event)

    async def publish_runtime_updated(self, payload: dict[str, Any], occurred_at: datetime) -> None:
        event = self._build_event(
            event_type="settings.runtime.updated",
            payload=payload,
            occurred_at=occurred_at,
            environment=payload.get("environment"),
        )
        await self._hub.publish(event)

    async def build_heartbeat(self, environment: str | None = None) -> dict[str, Any]:
        return self._build_event(
            event_type="system.heartbeat",
            payload={"status": "ok"},
            occurred_at=utc_now(),
            environment=environment,
        )
