from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import uuid4

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import SystemLog


@dataclass(slots=True)
class LogQuery:
    limit: int
    cursor: str | None = None
    level: str | None = None
    module: str | None = None
    environment: str | None = None
    channel_id: str | None = None
    correlation_id: str | None = None
    time_from: datetime | None = None
    time_to: datetime | None = None


class LogsRepository:
    async def append(
        self,
        db: AsyncSession,
        *,
        timestamp: datetime,
        level: str,
        module: str,
        environment: str,
        channel_id: str | None,
        channel_name: str | None,
        message: str,
        correlation_id: str,
        request_id: str | None,
        payload: dict | None = None,
    ) -> SystemLog:
        item = SystemLog(
            log_id=f"log_{uuid4().hex[:18]}",
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
        db.add(item)
        await db.flush()
        return item

    async def list(self, db: AsyncSession, query: LogQuery) -> tuple[list[SystemLog], str | None]:
        filters = []
        if query.cursor:
            try:
                cursor_id = int(query.cursor)
                filters.append(SystemLog.id < cursor_id)
            except ValueError:
                pass
        if query.level:
            filters.append(SystemLog.level == query.level)
        if query.module:
            filters.append(SystemLog.module == query.module)
        if query.environment:
            filters.append(SystemLog.environment == query.environment)
        if query.channel_id:
            filters.append(SystemLog.channel_id == query.channel_id)
        if query.correlation_id:
            filters.append(SystemLog.correlation_id == query.correlation_id)
        if query.time_from:
            filters.append(SystemLog.timestamp >= query.time_from)
        if query.time_to:
            filters.append(SystemLog.timestamp <= query.time_to)

        stmt = select(SystemLog)
        if filters:
            stmt = stmt.where(and_(*filters))

        stmt = stmt.order_by(SystemLog.id.desc()).limit(query.limit + 1)
        result = await db.execute(stmt)
        rows = list(result.scalars().all())

        has_more = len(rows) > query.limit
        rows = rows[: query.limit]
        next_cursor = str(rows[-1].id) if has_more and rows else None
        return rows, next_cursor
