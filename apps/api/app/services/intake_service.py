from __future__ import annotations

import re
from dataclasses import dataclass
from urllib.parse import urlparse

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.context import RequestContext
from app.core.errors import AppError
from app.core.security import hash_text, utc_now
from app.db.repositories import IntakeChannelRecord, IntakeRepository
from app.services.logs_service import LogsService
from app.services.telegram_intake_parser import PARSER_VERSION, parse_telegram_channel_html
from app.services.telegram_page_fetcher import TelegramPageFetcher

ALLOWED_SOURCE_TYPES = {"telegram_web"}
ALLOWED_CHANNEL_STATUSES = {"enabled", "disabled"}
TELEGRAM_USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9_]{5,64}$")


@dataclass(slots=True)
class IntakeSyncSummary:
    fetched_count: int
    new_count: int
    edited_count: int
    unchanged_count: int
    last_seen_source_message_id: str | None
    last_processed_source_message_id: str | None


class IntakeService:
    def __init__(self, logs_service: LogsService) -> None:
        self._repo = IntakeRepository()
        self._logs_service = logs_service
        self._fetcher = TelegramPageFetcher()

    @staticmethod
    def _normalize_source_type(source_type: str | None) -> str:
        value = (source_type or "telegram_web").strip()
        aliases = {
            "",
            "telegram_web",
            "telegram-web",
            "telegram web",
            "telegram",
            "电报网页源",
            "電報網頁源",
        }
        if value.lower() in {alias.lower() for alias in aliases}:
            return "telegram_web"
        if value not in ALLOWED_SOURCE_TYPES:
            raise AppError(code="INTAKE_INVALID_SOURCE_TYPE", message="暂仅支持 telegram_web 来源。", status_code=400)
        return value

    @staticmethod
    def _normalize_status(status: str | None) -> str:
        value = (status or "enabled").strip()
        if value not in ALLOWED_CHANNEL_STATUSES:
            raise AppError(code="INTAKE_INVALID_STATUS", message="状态必须为 enabled 或 disabled。", status_code=400)
        return value

    @staticmethod
    def _normalize_channel_name(channel_name: str | None) -> str:
        value = (channel_name or "").strip()
        if not value:
            raise AppError(code="INTAKE_INVALID_CHANNEL_NAME", message="频道名称不能为空。", status_code=400)
        if len(value) > 256:
            raise AppError(code="INTAKE_INVALID_CHANNEL_NAME", message="频道名称长度不能超过 256。", status_code=400)
        return value

    @staticmethod
    def _normalize_poll_interval_seconds(poll_interval_seconds: int | None) -> int:
        value = 30 if poll_interval_seconds is None else int(poll_interval_seconds)
        if value < 5 or value > 600:
            raise AppError(code="INTAKE_INVALID_POLL_INTERVAL", message="轮询间隔必须在 5 到 600 秒之间。", status_code=400)
        return value

    @staticmethod
    def _normalize_source_ref(source_ref: str | None) -> tuple[str, str]:
        raw = (source_ref or "").strip()
        if not raw:
            raise AppError(code="INTAKE_INVALID_SOURCE_REF", message="source_ref 不能为空。", status_code=400)

        if raw.startswith("@"):
            username = raw[1:]
        elif raw.startswith("http://") or raw.startswith("https://"):
            parsed = urlparse(raw)
            host = parsed.netloc.lower()
            if host not in {"t.me", "www.t.me", "telegram.me", "www.telegram.me"}:
                raise AppError(code="INTAKE_INVALID_SOURCE_REF", message="source_ref 必须是 t.me 链接。", status_code=400)
            path_parts = [part for part in parsed.path.split("/") if part]
            if not path_parts:
                raise AppError(code="INTAKE_INVALID_SOURCE_REF", message="source_ref 缺少频道名。", status_code=400)
            if path_parts[0] == "s" and len(path_parts) >= 2:
                username = path_parts[1]
            else:
                username = path_parts[0]
        elif raw.startswith("t.me/") or raw.startswith("telegram.me/"):
            return IntakeService._normalize_source_ref(f"https://{raw}")
        else:
            username = raw

        username = username.strip().lstrip("@")
        if not TELEGRAM_USERNAME_PATTERN.fullmatch(username):
            raise AppError(
                code="INTAKE_INVALID_SOURCE_REF",
                message="无法识别 Telegram 频道名，请提供 @name 或 https://t.me/s/name。",
                status_code=400,
            )
        canonical_ref = f"https://t.me/s/{username}"
        return username, canonical_ref

    @staticmethod
    def _serialize_channel_record(record: IntakeChannelRecord) -> dict:
        cursor = record.cursor
        last_fetch_at = record.source.last_fetch_at or record.source.updated_at
        last_message_result = record.source.last_message_result or "created"
        return {
            "channel_id": record.channel.channel_id,
            "channel_name": record.channel.channel_name,
            "source_id": record.source.source_id,
            "source_type": record.source.source_type,
            "source_ref": record.source.source_ref,
            "source_username": record.source.source_username,
            "status": record.source.status,
            "poll_interval_seconds": record.source.poll_interval_seconds,
            "last_fetch_at": last_fetch_at.isoformat() if last_fetch_at else None,
            "last_success_at": record.source.last_success_at.isoformat() if record.source.last_success_at else None,
            "last_error_summary": record.source.last_error_summary,
            "last_message_result": last_message_result,
            "cursor": (
                {
                    "last_seen_source_message_id": cursor.last_seen_source_message_id,
                    "last_processed_source_message_id": cursor.last_processed_source_message_id,
                    "last_fetched_at": cursor.last_fetched_at.isoformat() if cursor.last_fetched_at else None,
                    "last_success_at": cursor.last_success_at.isoformat() if cursor.last_success_at else None,
                    "last_error_at": cursor.last_error_at.isoformat() if cursor.last_error_at else None,
                    "last_error_code": cursor.last_error_code,
                    "last_error_message": cursor.last_error_message,
                    "consecutive_failures": cursor.consecutive_failures,
                }
                if cursor
                else None
            ),
        }

    @staticmethod
    def _max_source_message_id(values: list[str]) -> str | None:
        if not values:
            return None

        def _sort_key(item: str) -> tuple[int, str]:
            if item.isdigit():
                return (0, f"{int(item):020d}")
            return (1, item)

        return max(values, key=_sort_key)

    async def list_channels(self, db: AsyncSession) -> list[dict]:
        records = await self._repo.list_channels(db)
        return [self._serialize_channel_record(record) for record in records]

    async def create_channel(
        self,
        db: AsyncSession,
        *,
        channel_name: str | None,
        source_type: str | None,
        source_ref: str | None,
        status: str | None,
        poll_interval_seconds: int | None,
        request_context: RequestContext,
    ) -> dict:
        normalized_channel_name = self._normalize_channel_name(channel_name)
        normalized_source_type = self._normalize_source_type(source_type)
        normalized_status = self._normalize_status(status)
        normalized_poll_interval = self._normalize_poll_interval_seconds(poll_interval_seconds)
        source_username, canonical_source_ref = self._normalize_source_ref(source_ref)

        record = await self._repo.create_channel_with_source(
            db,
            channel_name=normalized_channel_name,
            status=normalized_status,
            source_type=normalized_source_type,
            source_ref=canonical_source_ref,
            source_username=source_username,
            poll_interval_seconds=normalized_poll_interval,
        )
        now = utc_now()
        record.source.last_fetch_at = now
        record.source.last_message_result = "created"

        await self._logs_service.append_log(
            db,
            timestamp=now,
            level="info",
            module="telegram-intake",
            environment="paper",
            message=f"Telegram 频道已创建: {record.channel.channel_name}",
            correlation_id=request_context.correlation_id,
            request_id=request_context.request_id,
            channel_id=record.channel.channel_id,
            channel_name=record.channel.channel_name,
            payload={"source_ref": record.source.source_ref, "source_type": record.source.source_type},
        )
        return self._serialize_channel_record(record)

    async def patch_channel(
        self,
        db: AsyncSession,
        *,
        channel_id: str,
        payload: dict,
        request_context: RequestContext,
    ) -> dict:
        record = await self._repo.get_record_by_channel_id(db, channel_id, for_update=True)
        if record is None:
            raise AppError(code="RESOURCE_NOT_FOUND", message="频道不存在。", status_code=404)

        if "channel_name" in payload and payload["channel_name"] is not None:
            record.channel.channel_name = self._normalize_channel_name(str(payload["channel_name"]))
        any_update = False
        if "status" in payload and payload["status"] is not None:
            normalized_status = self._normalize_status(str(payload["status"]))
            record.channel.status = normalized_status
            record.source.status = normalized_status
            any_update = True
        if "source_type" in payload and payload["source_type"] is not None:
            record.source.source_type = self._normalize_source_type(str(payload["source_type"]))
            any_update = True
        if "source_ref" in payload and payload["source_ref"] is not None:
            source_username, canonical_source_ref = self._normalize_source_ref(str(payload["source_ref"]))
            record.source.source_ref = canonical_source_ref
            record.source.source_username = source_username
            any_update = True
        if "poll_interval_seconds" in payload and payload["poll_interval_seconds"] is not None:
            record.source.poll_interval_seconds = self._normalize_poll_interval_seconds(int(payload["poll_interval_seconds"]))
            any_update = True

        now = utc_now()
        if any_update:
            record.source.last_fetch_at = now
            record.source.last_message_result = "updated"

        await self._logs_service.append_log(
            db,
            timestamp=now,
            level="info",
            module="telegram-intake",
            environment="paper",
            message=f"Telegram 频道配置已更新: {record.channel.channel_name}",
            correlation_id=request_context.correlation_id,
            request_id=request_context.request_id,
            channel_id=record.channel.channel_id,
            channel_name=record.channel.channel_name,
        )
        return self._serialize_channel_record(record)

    async def sync_channel_once(
        self,
        db: AsyncSession,
        *,
        channel_id: str,
        request_context: RequestContext,
    ) -> IntakeSyncSummary:
        record = await self._repo.get_record_by_channel_id(db, channel_id, for_update=True)
        if record is None:
            raise AppError(code="RESOURCE_NOT_FOUND", message="频道不存在。", status_code=404)
        cursor = record.cursor or await self._repo.get_or_create_cursor(db, channel_source_pk=record.source.id)
        now = utc_now()

        try:
            fetched = await self._fetcher.fetch_channel_page(channel_username=record.source.source_username)
            parsed_messages = parse_telegram_channel_html(fetched.html_text)
        except AppError as exc:
            cursor.last_fetched_at = now
            cursor.last_error_at = now
            cursor.last_error_code = exc.code
            cursor.last_error_message = exc.message
            cursor.consecutive_failures += 1
            record.source.last_fetch_at = now
            record.source.last_error_summary = exc.message
            record.source.last_message_result = "fetch_error"
            await self._logs_service.append_log(
                db,
                timestamp=now,
                level="error",
                module="telegram-intake",
                environment="paper",
                message=f"Telegram 抓取失败: {record.channel.channel_name}",
                correlation_id=request_context.correlation_id,
                request_id=request_context.request_id,
                channel_id=record.channel.channel_id,
                channel_name=record.channel.channel_name,
                payload={"source_ref": record.source.source_ref, "error_code": exc.code},
            )
            raise

        new_count = 0
        edited_count = 0
        unchanged_count = 0
        source_message_ids: list[str] = []

        for parsed in parsed_messages:
            source_message_ids.append(parsed.source_message_id)
            content_hash = hash_text(parsed.raw_content)
            normalized = await self._repo.get_normalized_message_for_update(
                db,
                channel_pk=record.channel.id,
                source_type=record.source.source_type,
                source_message_id=parsed.source_message_id,
            )
            if normalized is None:
                change_type = "new"
                new_count += 1
            elif normalized.current_content_hash != content_hash:
                change_type = "edited"
                edited_count += 1
            else:
                change_type = "unchanged"
                unchanged_count += 1

            raw = await self._repo.append_raw_message(
                db,
                channel_pk=record.channel.id,
                channel_source_pk=record.source.id,
                source_type=record.source.source_type,
                source_message_id=parsed.source_message_id,
                raw_content=parsed.raw_content,
                content_hash=content_hash,
                fetched_at=now,
                detected_change_type=change_type,
                raw_payload_ref=fetched.raw_payload_ref,
                parser_version=PARSER_VERSION,
                correlation_id=request_context.correlation_id,
            )

            if normalized is None:
                normalized = await self._repo.create_normalized_message(
                    db,
                    channel_pk=record.channel.id,
                    source_type=record.source.source_type,
                    source_message_id=parsed.source_message_id,
                    current_version_no=1,
                    current_content=parsed.raw_content,
                    current_content_hash=content_hash,
                    visible_at=parsed.visible_at,
                    message_status="new",
                    ready_for_decision=True,
                    latest_raw_message_pk=raw.id,
                    correlation_id=request_context.correlation_id,
                )
                await self._repo.append_message_version(
                    db,
                    normalized_message_pk=normalized.id,
                    version_no=1,
                    content=parsed.raw_content,
                    content_hash=content_hash,
                    source_edit_token=parsed.source_edit_token,
                    diff_summary=None,
                )
            elif change_type == "edited":
                normalized.current_version_no += 1
                normalized.current_content = parsed.raw_content
                normalized.current_content_hash = content_hash
                normalized.visible_at = parsed.visible_at
                normalized.message_status = "edited"
                normalized.ready_for_decision = True
                normalized.latest_raw_message_pk = raw.id
                normalized.correlation_id = request_context.correlation_id
                await self._repo.append_message_version(
                    db,
                    normalized_message_pk=normalized.id,
                    version_no=normalized.current_version_no,
                    content=parsed.raw_content,
                    content_hash=content_hash,
                    source_edit_token=parsed.source_edit_token,
                    diff_summary="content_changed",
                )
            else:
                normalized.message_status = "unchanged"
                normalized.ready_for_decision = False
                normalized.latest_raw_message_pk = raw.id
                normalized.correlation_id = request_context.correlation_id

        last_source_message_id = self._max_source_message_id(source_message_ids)
        cursor.last_fetched_at = now
        cursor.last_success_at = now
        cursor.last_error_at = None
        cursor.last_error_code = None
        cursor.last_error_message = None
        cursor.consecutive_failures = 0
        if last_source_message_id is not None:
            cursor.last_seen_source_message_id = last_source_message_id
            cursor.last_processed_source_message_id = last_source_message_id

        record.source.last_fetch_at = now
        record.source.last_success_at = now
        record.source.last_error_summary = None
        record.source.last_message_result = f"new={new_count},edited={edited_count},unchanged={unchanged_count}"

        await self._logs_service.append_log(
            db,
            timestamp=now,
            level="info",
            module="telegram-intake",
            environment="paper",
            message=f"Telegram 频道抓取完成: {record.channel.channel_name}",
            correlation_id=request_context.correlation_id,
            request_id=request_context.request_id,
            channel_id=record.channel.channel_id,
            channel_name=record.channel.channel_name,
            payload={
                "fetched_count": len(parsed_messages),
                "new_count": new_count,
                "edited_count": edited_count,
                "unchanged_count": unchanged_count,
                "source_ref": record.source.source_ref,
            },
        )

        return IntakeSyncSummary(
            fetched_count=len(parsed_messages),
            new_count=new_count,
            edited_count=edited_count,
            unchanged_count=unchanged_count,
            last_seen_source_message_id=cursor.last_seen_source_message_id,
            last_processed_source_message_id=cursor.last_processed_source_message_id,
        )
