from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import RuntimeSetting


class RuntimeSettingsRepository:
    async def get(self, db: AsyncSession) -> RuntimeSetting | None:
        stmt = select(RuntimeSetting).where(RuntimeSetting.id == 1)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def upsert(
        self,
        db: AsyncSession,
        *,
        environment: str,
        global_trading_enabled: bool,
        model: str,
        reasoning_level: str,
        default_leverage: str,
        manual_confirmation_threshold: str,
        context_window_size: int,
        new_position_capital_min: str,
        new_position_capital_max: str,
        updated_at: datetime,
    ) -> RuntimeSetting:
        current = await self.get(db)
        if current is None:
            current = RuntimeSetting(
                id=1,
                environment=environment,
                global_trading_enabled=global_trading_enabled,
                model=model,
                reasoning_level=reasoning_level,
                default_leverage=default_leverage,
                manual_confirmation_threshold=manual_confirmation_threshold,
                context_window_size=context_window_size,
                new_position_capital_min=new_position_capital_min,
                new_position_capital_max=new_position_capital_max,
                updated_at=updated_at,
            )
            db.add(current)
            await db.flush()
            return current

        current.environment = environment
        current.global_trading_enabled = global_trading_enabled
        current.model = model
        current.reasoning_level = reasoning_level
        current.default_leverage = default_leverage
        current.manual_confirmation_threshold = manual_confirmation_threshold
        current.context_window_size = context_window_size
        current.new_position_capital_min = new_position_capital_min
        current.new_position_capital_max = new_position_capital_max
        current.updated_at = updated_at
        await db.flush()
        return current
