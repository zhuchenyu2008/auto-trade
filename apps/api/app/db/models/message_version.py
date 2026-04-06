from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MessageVersion(Base):
    __tablename__ = "message_versions"
    __table_args__ = (
        UniqueConstraint("normalized_message_pk", "version_no", name="uq_message_versions_version_no"),
        UniqueConstraint("normalized_message_pk", "content_hash", name="uq_message_versions_content_hash"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    message_version_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    normalized_message_pk: Mapped[int] = mapped_column(
        ForeignKey("normalized_messages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version_no: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    source_edit_token: Mapped[str | None] = mapped_column(String(128), nullable=True)
    diff_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
