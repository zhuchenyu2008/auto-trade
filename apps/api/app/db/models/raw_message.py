from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class RawMessage(Base):
    __tablename__ = "raw_messages"
    __table_args__ = (
        Index(
            "ix_raw_messages_source_message_fetched",
            "channel_source_pk",
            "source_message_id",
            "fetched_at",
        ),
        Index("ix_raw_messages_channel_fetched", "channel_pk", "fetched_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    raw_message_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    channel_pk: Mapped[int] = mapped_column(
        ForeignKey("channels.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    channel_source_pk: Mapped[int] = mapped_column(
        ForeignKey("channel_sources.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    source_message_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    raw_content: Mapped[str] = mapped_column(Text, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    detected_change_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    raw_payload_ref: Mapped[str | None] = mapped_column(String(256), nullable=True)
    parser_version: Mapped[str] = mapped_column(String(32), nullable=False)
    correlation_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
