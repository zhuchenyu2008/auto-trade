from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import OperatorAction


class AuditRepository:
    async def append_action(
        self,
        db: AsyncSession,
        *,
        action: str,
        target_type: str,
        target_id: str,
        result: str,
        operator_source: str,
        request_id: str,
        correlation_id: str,
        idempotency_key: str | None,
        detail: dict | None = None,
        message: str | None = None,
    ) -> OperatorAction:
        item = OperatorAction(
            action=action,
            target_type=target_type,
            target_id=target_id,
            result=result,
            operator_source=operator_source,
            request_id=request_id,
            correlation_id=correlation_id,
            idempotency_key=idempotency_key,
            detail=detail,
            message=message,
        )
        db.add(item)
        await db.flush()
        return item
