from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from app.api.deps import get_events_service, get_settings, require_session
from app.core.config import Settings
from app.schemas.auth import SessionResponse
from app.services.events_service import EventsService

router = APIRouter(prefix="/events", tags=["events"])


@router.get("/stream")
async def stream_events(
    request: Request,
    session_view: SessionResponse = Depends(require_session),
    settings: Settings = Depends(get_settings),
    events_service: EventsService = Depends(get_events_service),
):
    hub = request.app.state.sse_hub
    queue = await hub.subscribe()

    async def event_generator():
        try:
            heartbeat = await events_service.build_heartbeat(session_view.environment)
            yield f"data: {json.dumps(heartbeat, ensure_ascii=False)}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=settings.sse_heartbeat_seconds)
                except asyncio.TimeoutError:
                    heartbeat = await events_service.build_heartbeat(session_view.environment)
                    data = json.dumps(heartbeat, ensure_ascii=False)
                yield f"data: {data}\n\n"
        finally:
            await hub.unsubscribe(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
