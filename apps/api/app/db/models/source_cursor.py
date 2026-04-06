from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SourceCursor(Base):
    __tablename__ = "source_cursors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    channel_source_pk: Mapped[int] = mapped_column(
        ForeignKey("channel_sources.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    last_seen_source_message_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    last_processed_source_message_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    last_fetched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_success_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    last_error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    consecutive_failures: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
