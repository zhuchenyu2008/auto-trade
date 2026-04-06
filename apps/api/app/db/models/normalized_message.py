from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class NormalizedMessage(Base):
    __tablename__ = "normalized_messages"
    __table_args__ = (
        UniqueConstraint(
            "channel_pk",
            "source_type",
            "source_message_id",
            name="uq_normalized_messages_source_message",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    normalized_message_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    channel_pk: Mapped[int] = mapped_column(
        ForeignKey("channels.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    source_message_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    current_version_no: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    current_content: Mapped[str] = mapped_column(Text, nullable=False)
    current_content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    visible_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    message_status: Mapped[str] = mapped_column(String(32), nullable=False)
    ready_for_decision: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    latest_raw_message_pk: Mapped[int | None] = mapped_column(
        ForeignKey("raw_messages.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    correlation_id: Mapped[str] = mapped_column(String(128), nullable=False)
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
