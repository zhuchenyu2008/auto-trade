from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ChannelSource(Base):
    __tablename__ = "channel_sources"
    __table_args__ = (
        UniqueConstraint("channel_pk", "source_type", name="uq_channel_sources_channel_source_type"),
        Index("ix_channel_sources_source_username", "source_username"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    channel_pk: Mapped[int] = mapped_column(
        ForeignKey("channels.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True, default="telegram_web")
    source_ref: Mapped[str] = mapped_column(String(512), nullable=False)
    source_username: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, index=True, default="enabled")
    poll_interval_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    last_fetch_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_success_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_message_result: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
