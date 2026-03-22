from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class RuntimeSetting(Base):
    __tablename__ = "runtime_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    environment: Mapped[str] = mapped_column(String(16), nullable=False)
    global_trading_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False)
    model: Mapped[str] = mapped_column(String(128), nullable=False)
    reasoning_level: Mapped[str] = mapped_column(String(16), nullable=False)
    default_leverage: Mapped[str] = mapped_column(String(32), nullable=False)
    manual_confirmation_threshold: Mapped[str] = mapped_column(String(32), nullable=False)
    context_window_size: Mapped[int] = mapped_column(Integer, nullable=False)
    new_position_capital_min: Mapped[str] = mapped_column(String(32), nullable=False)
    new_position_capital_max: Mapped[str] = mapped_column(String(32), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
