from __future__ import annotations

import secrets
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    Channel,
    ChannelSource,
    MessageVersion,
    NormalizedMessage,
    RawMessage,
    SourceCursor,
)


@dataclass(slots=True)
class IntakeChannelRecord:
    channel: Channel
    source: ChannelSource
    cursor: SourceCursor | None


class IntakeRepository:
    async def list_channels(self, db: AsyncSession) -> list[IntakeChannelRecord]:
        stmt: Select[tuple[Channel, ChannelSource, SourceCursor | None]] = (
            select(Channel, ChannelSource, SourceCursor)
            .join(ChannelSource, ChannelSource.channel_pk == Channel.id)
            .outerjoin(SourceCursor, SourceCursor.channel_source_pk == ChannelSource.id)
            .order_by(Channel.id.desc())
        )
        rows = (await db.execute(stmt)).all()
        return [IntakeChannelRecord(channel=row[0], source=row[1], cursor=row[2]) for row in rows]

    async def create_channel_with_source(
        self,
        db: AsyncSession,
        *,
        channel_name: str,
        status: str,
        source_type: str,
        source_ref: str,
        source_username: str,
        poll_interval_seconds: int,
    ) -> IntakeChannelRecord:
        channel = Channel(
            channel_id=f"ch_{secrets.token_hex(4)}",
            channel_name=channel_name,
            status=status,
        )
        db.add(channel)
        await db.flush()

        source = ChannelSource(
            source_id=f"src_{secrets.token_hex(4)}",
            channel_pk=channel.id,
            source_type=source_type,
            source_ref=source_ref,
            source_username=source_username,
            status=status,
            poll_interval_seconds=poll_interval_seconds,
        )
        db.add(source)
        await db.flush()

        cursor = SourceCursor(channel_source_pk=source.id)
        db.add(cursor)
        await db.flush()

        return IntakeChannelRecord(channel=channel, source=source, cursor=cursor)

    async def get_channel_by_channel_id(self, db: AsyncSession, channel_id: str) -> Channel | None:
        stmt = select(Channel).where(Channel.channel_id == channel_id)
        return (await db.execute(stmt)).scalar_one_or_none()

    async def get_record_by_channel_id(
        self,
        db: AsyncSession,
        channel_id: str,
        *,
        for_update: bool = False,
    ) -> IntakeChannelRecord | None:
        stmt: Select[tuple[Channel, ChannelSource]] = (
            select(Channel, ChannelSource)
            .join(ChannelSource, ChannelSource.channel_pk == Channel.id)
            .where(Channel.channel_id == channel_id)
        )
        if for_update:
            stmt = stmt.with_for_update()

        row = (await db.execute(stmt)).one_or_none()
        if row is None:
            return None

        channel, source = row
        cursor_stmt = select(SourceCursor).where(SourceCursor.channel_source_pk == source.id)
        if for_update:
            cursor_stmt = cursor_stmt.with_for_update()
        cursor = (await db.execute(cursor_stmt)).scalar_one_or_none()

        return IntakeChannelRecord(channel=channel, source=source, cursor=cursor)

    async def get_or_create_cursor(self, db: AsyncSession, *, channel_source_pk: int) -> SourceCursor:
        stmt = select(SourceCursor).where(SourceCursor.channel_source_pk == channel_source_pk)
        cursor = (await db.execute(stmt)).scalar_one_or_none()
        if cursor is not None:
            return cursor

        cursor = SourceCursor(channel_source_pk=channel_source_pk)
        db.add(cursor)
        await db.flush()
        return cursor

    async def get_normalized_message_for_update(
        self,
        db: AsyncSession,
        *,
        channel_pk: int,
        source_type: str,
        source_message_id: str,
    ) -> NormalizedMessage | None:
        stmt = (
            select(NormalizedMessage)
            .where(
                NormalizedMessage.channel_pk == channel_pk,
                NormalizedMessage.source_type == source_type,
                NormalizedMessage.source_message_id == source_message_id,
            )
            .with_for_update()
        )
        return (await db.execute(stmt)).scalar_one_or_none()

    async def append_raw_message(
        self,
        db: AsyncSession,
        *,
        channel_pk: int,
        channel_source_pk: int,
        source_type: str,
        source_message_id: str,
        raw_content: str,
        content_hash: str,
        fetched_at: datetime,
        detected_change_type: str,
        raw_payload_ref: str | None,
        parser_version: str,
        correlation_id: str,
    ) -> RawMessage:
        item = RawMessage(
            raw_message_id=f"raw_{secrets.token_hex(6)}",
            channel_pk=channel_pk,
            channel_source_pk=channel_source_pk,
            source_type=source_type,
            source_message_id=source_message_id,
            raw_content=raw_content,
            content_hash=content_hash,
            fetched_at=fetched_at,
            detected_change_type=detected_change_type,
            raw_payload_ref=raw_payload_ref,
            parser_version=parser_version,
            correlation_id=correlation_id,
        )
        db.add(item)
        await db.flush()
        return item

    async def create_normalized_message(
        self,
        db: AsyncSession,
        *,
        channel_pk: int,
        source_type: str,
        source_message_id: str,
        current_version_no: int,
        current_content: str,
        current_content_hash: str,
        visible_at: datetime | None,
        message_status: str,
        ready_for_decision: bool,
        latest_raw_message_pk: int,
        correlation_id: str,
    ) -> NormalizedMessage:
        item = NormalizedMessage(
            normalized_message_id=f"msg_{secrets.token_hex(6)}",
            channel_pk=channel_pk,
            source_type=source_type,
            source_message_id=source_message_id,
            current_version_no=current_version_no,
            current_content=current_content,
            current_content_hash=current_content_hash,
            visible_at=visible_at,
            message_status=message_status,
            ready_for_decision=ready_for_decision,
            latest_raw_message_pk=latest_raw_message_pk,
            correlation_id=correlation_id,
        )
        db.add(item)
        await db.flush()
        return item

    async def append_message_version(
        self,
        db: AsyncSession,
        *,
        normalized_message_pk: int,
        version_no: int,
        content: str,
        content_hash: str,
        source_edit_token: str | None,
        diff_summary: str | None,
    ) -> MessageVersion:
        item = MessageVersion(
            message_version_id=f"ver_{secrets.token_hex(6)}",
            normalized_message_pk=normalized_message_pk,
            version_no=version_no,
            content=content,
            content_hash=content_hash,
            source_edit_token=source_edit_token,
            diff_summary=diff_summary,
        )
        db.add(item)
        await db.flush()
        return item
