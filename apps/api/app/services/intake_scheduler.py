from __future__ import annotations

import asyncio
import time
from collections.abc import Mapping
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.context import RequestContext, create_correlation_id, create_request_id
from app.core.errors import AppError
from app.core.logging import get_logger
from app.services.intake_service import IntakeService

logger = get_logger("auto-trade.intake-scheduler")


@dataclass(slots=True)
class _ScheduledChannel:
    channel_id: str
    status: str
    poll_interval_seconds: int


class IntakeScheduler:
    def __init__(
        self,
        *,
        session_factory: async_sessionmaker[AsyncSession],
        intake_service: IntakeService,
        tick_seconds: float = 5.0,
    ) -> None:
        self._session_factory = session_factory
        self._intake_service = intake_service
        self._tick_seconds = tick_seconds
        self._task: asyncio.Task[None] | None = None
        self._next_run_by_channel_id: dict[str, float] = {}

    def start(self) -> None:
        if self._task is not None and not self._task.done():
            return
        self._task = asyncio.create_task(self._run_loop(), name="intake-scheduler-loop")
        logger.info("intake.scheduler.started")

    async def close(self) -> None:
        if self._task is None:
            return
        self._task.cancel()
        try:
            await self._task
        except asyncio.CancelledError:
            pass
        finally:
            self._task = None
            self._next_run_by_channel_id.clear()
            logger.info("intake.scheduler.stopped")

    async def _run_loop(self) -> None:
        while True:
            try:
                await self._tick()
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("intake.scheduler.tick_failed")
            await asyncio.sleep(self._tick_seconds)

    async def _tick(self) -> None:
        channels = await self._load_channels()
        now_monotonic = time.monotonic()
        active_channel_ids = {item.channel_id for item in channels}
        stale_channel_ids = [channel_id for channel_id in self._next_run_by_channel_id if channel_id not in active_channel_ids]
        for channel_id in stale_channel_ids:
            self._next_run_by_channel_id.pop(channel_id, None)

        for item in channels:
            if item.status != "enabled":
                continue
            poll_interval = max(5, int(item.poll_interval_seconds or 30))
            next_run = self._next_run_by_channel_id.get(item.channel_id, 0.0)
            if now_monotonic < next_run:
                continue
            await self._sync_channel_once(item.channel_id)
            self._next_run_by_channel_id[item.channel_id] = now_monotonic + float(poll_interval)

    async def _load_channels(self) -> list[_ScheduledChannel]:
        async with self._session_factory() as db:
            serialized = await self._intake_service.list_channels(db)
        channels: list[_ScheduledChannel] = []
        for item in serialized:
            if not isinstance(item, Mapping):
                continue
            channel_id = str(item.get("channel_id") or "").strip()
            if not channel_id:
                continue
            status = str(item.get("status") or "disabled")
            interval_value = item.get("poll_interval_seconds")
            try:
                poll_interval_seconds = int(interval_value) if interval_value is not None else 30
            except (TypeError, ValueError):
                poll_interval_seconds = 30
            channels.append(
                _ScheduledChannel(
                    channel_id=channel_id,
                    status=status,
                    poll_interval_seconds=poll_interval_seconds,
                )
            )
        return channels

    async def _sync_channel_once(self, channel_id: str) -> None:
        request_context = RequestContext(
            request_id=create_request_id(),
            correlation_id=create_correlation_id(),
            operator_source="intake_scheduler",
            idempotency_key=None,
            audit_action=None,
            audit_target=None,
        )
        async with self._session_factory() as db:
            try:
                result = await self._intake_service.sync_channel_once(
                    db,
                    channel_id=channel_id,
                    request_context=request_context,
                )
                await db.commit()
                logger.info(
                    "intake.scheduler.channel_synced",
                    extra={
                        "channel_id": channel_id,
                        "fetched_count": result.fetched_count,
                        "new_count": result.new_count,
                        "edited_count": result.edited_count,
                        "unchanged_count": result.unchanged_count,
                    },
                )
            except AppError as exc:
                await db.commit()
                logger.warning(
                    "intake.scheduler.channel_sync_failed",
                    extra={"channel_id": channel_id, "error_code": exc.code, "error_message": exc.message},
                )
            except Exception:
                await db.rollback()
                logger.exception("intake.scheduler.channel_sync_unexpected_error", extra={"channel_id": channel_id})
