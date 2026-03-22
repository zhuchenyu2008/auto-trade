from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.context import RequestContext
from app.core.security import utc_now
from app.db.models import RuntimeSetting
from app.db.repositories import AuditRepository, RuntimeSettingsRepository
from app.schemas.settings import CapitalRange, RuntimeSettingsResponse, RuntimeSettingsUpdateRequest
from app.services.events_service import EventsService
from app.services.logs_service import LogsService


class SettingsService:
    def __init__(
        self,
        settings: Settings,
        logs_service: LogsService,
        events_service: EventsService,
    ) -> None:
        self._settings = settings
        self._repo = RuntimeSettingsRepository()
        self._audit_repo = AuditRepository()
        self._logs_service = logs_service
        self._events_service = events_service

    @staticmethod
    def _to_schema(item: RuntimeSetting) -> RuntimeSettingsResponse:
        return RuntimeSettingsResponse(
            environment=item.environment,  # type: ignore[arg-type]
            global_trading_enabled=item.global_trading_enabled,
            model=item.model,
            reasoning_level=item.reasoning_level,  # type: ignore[arg-type]
            default_leverage=item.default_leverage,
            manual_confirmation_threshold=item.manual_confirmation_threshold,
            context_window_size=item.context_window_size,
            new_position_capital_range=CapitalRange(
                min=item.new_position_capital_min,
                max=item.new_position_capital_max,
            ),
            updated_at=item.updated_at,
        )

    async def _ensure_default(self, db: AsyncSession) -> RuntimeSetting:
        current = await self._repo.get(db)
        if current is not None:
            return current
        now = utc_now()
        current = await self._repo.upsert(
            db,
            environment=self._settings.runtime_default_environment,
            global_trading_enabled=self._settings.runtime_default_global_trading_enabled,
            model=self._settings.runtime_default_model,
            reasoning_level=self._settings.runtime_default_reasoning_level,
            default_leverage=self._settings.runtime_default_default_leverage,
            manual_confirmation_threshold=self._settings.runtime_default_manual_confirmation_threshold,
            context_window_size=self._settings.runtime_default_context_window_size,
            new_position_capital_min=self._settings.runtime_default_new_position_capital_min,
            new_position_capital_max=self._settings.runtime_default_new_position_capital_max,
            updated_at=now,
        )
        await db.commit()
        await db.refresh(current)
        return current

    async def get_runtime_settings(self, db: AsyncSession) -> RuntimeSettingsResponse:
        current = await self._ensure_default(db)
        return self._to_schema(current)

    async def update_runtime_settings(
        self,
        db: AsyncSession,
        payload: RuntimeSettingsUpdateRequest,
        request_context: RequestContext,
    ) -> RuntimeSettingsResponse:
        now = utc_now()
        updated = await self._repo.upsert(
            db,
            environment=payload.environment,
            global_trading_enabled=payload.global_trading_enabled,
            model=payload.model,
            reasoning_level=payload.reasoning_level,
            default_leverage=payload.default_leverage,
            manual_confirmation_threshold=payload.manual_confirmation_threshold,
            context_window_size=payload.context_window_size,
            new_position_capital_min=payload.new_position_capital_range.min,
            new_position_capital_max=payload.new_position_capital_range.max,
            updated_at=now,
        )
        await self._audit_repo.append_action(
            db,
            action=request_context.audit_action or "runtime_settings.update",
            target_type="runtime_settings",
            target_id=payload.environment,
            result="success",
            operator_source=request_context.operator_source,
            request_id=request_context.request_id,
            correlation_id=request_context.correlation_id,
            idempotency_key=request_context.idempotency_key,
            detail={"environment": payload.environment},
        )
        await self._logs_service.append_log(
            db,
            timestamp=now,
            level="info",
            module="runtime-settings",
            environment=payload.environment,
            message="运行时设置已更新",
            correlation_id=request_context.correlation_id,
            request_id=request_context.request_id,
            payload={"action": "settings.runtime.updated"},
        )
        await db.commit()
        await db.refresh(updated)
        response = self._to_schema(updated)
        await self._events_service.publish_runtime_updated(
            payload=response.model_dump(mode="json"),
            occurred_at=now,
        )
        return response
