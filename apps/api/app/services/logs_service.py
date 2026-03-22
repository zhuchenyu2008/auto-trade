from __future__ import annotations

from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import SystemLog
from app.db.repositories import LogQuery, LogsRepository
from app.schemas.logs import CursorPage, LogItemResponse, LogsResponse
from app.services.events_service import EventsService


class LogsService:
    def __init__(self, events_service: EventsService) -> None:
        self._repo = LogsRepository()
        self._events_service = events_service

    @staticmethod
    def _to_schema(item: SystemLog) -> LogItemResponse:
        return LogItemResponse(
            log_id=item.log_id,
            timestamp=item.timestamp,
            level=item.level,  # type: ignore[arg-type]
            module=item.module,
            environment=item.environment,  # type: ignore[arg-type]
            channel_id=item.channel_id,
            channel_name=item.channel_name,
            message=item.message,
            correlation_id=item.correlation_id,
        )

    async def append_log(
        self,
        db: AsyncSession,
        *,
        timestamp: datetime,
        level: str,
        module: str,
        environment: str,
        message: str,
        correlation_id: str,
        request_id: str | None,
        channel_id: str | None = None,
        channel_name: str | None = None,
        payload: dict | None = None,
    ) -> SystemLog:
        item = await self._repo.append(
            db,
            timestamp=timestamp,
            level=level,
            module=module,
            environment=environment,
            channel_id=channel_id,
            channel_name=channel_name,
            message=message,
            correlation_id=correlation_id,
            request_id=request_id,
            payload=payload,
        )
        await self._events_service.publish_log_created(
            payload=self._to_schema(item).model_dump(mode="json"),
            occurred_at=timestamp,
        )
        return item

    async def list_logs(
        self,
        db: AsyncSession,
        *,
        limit: int,
        cursor: str | None,
        level: str | None,
        module: str | None,
        environment: str | None,
        channel_id: str | None,
        correlation_id: str | None,
        time_from: datetime | None,
        time_to: datetime | None,
    ) -> LogsResponse:
        query = LogQuery(
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
        rows, next_cursor = await self._repo.list(db, query)
        items = [self._to_schema(row) for row in rows]
        page = CursorPage(next_cursor=next_cursor, has_more=next_cursor is not None)
        return LogsResponse(items=items, page=page)
