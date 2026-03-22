from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_logs_service, require_session
from app.api.response import success_response
from app.schemas.auth import SessionResponse
from app.services.logs_service import LogsService

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("")
async def get_logs(
    request: Request,
    _: SessionResponse = Depends(require_session),
    db: AsyncSession = Depends(get_db),
    logs_service: LogsService = Depends(get_logs_service),
    cursor: str | None = Query(default=None),
    limit: int = Query(default=120, ge=1, le=200),
    level: str | None = Query(default=None),
    module: str | None = Query(default=None),
    environment: str | None = Query(default=None),
    channel_id: str | None = Query(default=None),
    correlation_id: str | None = Query(default=None),
    time_from: datetime | None = Query(default=None),
    time_to: datetime | None = Query(default=None),
):
    data = await logs_service.list_logs(
        db,
        limit=limit,
        cursor=cursor,
        level=level,
        module=module,
        environment=environment,
        channel_id=channel_id,
        correlation_id=correlation_id,
        time_from=time_from,
        time_to=time_to,
    )
    return success_response(request, data.model_dump(mode="json"))
