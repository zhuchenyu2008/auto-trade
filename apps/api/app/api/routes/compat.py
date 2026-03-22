from __future__ import annotations

import secrets
from typing import Any

from fastapi import APIRouter, Body, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_logs_service, get_request_ctx, require_session
from app.api.response import success_response
from app.core.context import RequestContext
from app.core.errors import AppError
from app.core.security import utc_now
from app.schemas.auth import SessionResponse
from app.services.logs_service import LogsService

router = APIRouter(tags=["compat"])


def _store(request: Request, key: str, default):
    if not hasattr(request.app.state, key):
        setattr(request.app.state, key, default)
    return getattr(request.app.state, key)


@router.get("/overview/summary")
async def get_overview_summary(
    request: Request,
    session: SessionResponse = Depends(require_session),
):
    channels = _store(request, "channel_store", [])
    data = {
        "environment": session.environment,
        "global_trading_enabled": session.global_trading_enabled,
        "health_status": session.health_status,
        "pending_manual_confirmation_count": 0,
        "recent_alerts": [],
        "channel_summaries": channels,
    }
    return success_response(request, data)


@router.get("/channels")
async def get_channels(
    request: Request,
    _: SessionResponse = Depends(require_session),
):
    channels = _store(request, "channel_store", [])
    return success_response(
        request,
        {
            "items": channels,
            "page": {"next_cursor": None, "has_more": False},
        },
    )


@router.post("/channels")
async def create_channel(
    request: Request,
    payload: dict[str, Any] = Body(...),
    _: SessionResponse = Depends(require_session),
    db: AsyncSession = Depends(get_db),
    request_context: RequestContext = Depends(get_request_ctx),
    logs_service: LogsService = Depends(get_logs_service),
):
    now = utc_now().isoformat()
    channel = {
        "channel_id": f"ch_{secrets.token_hex(4)}",
        "channel_name": str(payload.get("channel_name") or "Unnamed"),
        "source_type": str(payload.get("source_type") or "telegram_web"),
        "source_ref": str(payload.get("source_ref") or "-"),
        "status": "enabled",
        "last_fetch_at": now,
        "last_success_at": None,
        "last_error_summary": None,
        "last_message_result": "created",
    }
    channels = _store(request, "channel_store", [])
    channels.insert(0, channel)
    await logs_service.append_log(
        db,
        timestamp=utc_now(),
        level="info",
        module="channel-config",
        environment="paper",
        message=f"频道已创建: {channel['channel_name']}",
        correlation_id=request_context.correlation_id,
        request_id=request_context.request_id,
        channel_id=channel["channel_id"],
        channel_name=channel["channel_name"],
    )
    await db.commit()
    return success_response(request, channel, status_code=201)


@router.patch("/channels/{channel_id}")
async def patch_channel(
    channel_id: str,
    request: Request,
    payload: dict[str, Any] = Body(...),
    _: SessionResponse = Depends(require_session),
):
    channels = _store(request, "channel_store", [])
    for item in channels:
        if item["channel_id"] == channel_id:
            if "channel_name" in payload and payload["channel_name"] is not None:
                item["channel_name"] = str(payload["channel_name"])
            if "source_type" in payload and payload["source_type"] is not None:
                item["source_type"] = str(payload["source_type"])
            if "source_ref" in payload and payload["source_ref"] is not None:
                item["source_ref"] = str(payload["source_ref"])
            if "status" in payload and payload["status"] in {"enabled", "disabled"}:
                item["status"] = payload["status"]
            item["last_fetch_at"] = utc_now().isoformat()
            return success_response(request, item)
    raise AppError(code="RESOURCE_NOT_FOUND", message="频道不存在。", status_code=404)


def _empty_list() -> dict[str, Any]:
    return {"items": [], "page": {"next_cursor": None, "has_more": False}}


@router.get("/manual-confirmations")
async def get_manual_confirmations(
    request: Request,
    _: SessionResponse = Depends(require_session),
):
    return success_response(request, _empty_list())


@router.get("/orders")
async def get_orders(
    request: Request,
    _: SessionResponse = Depends(require_session),
):
    return success_response(request, _empty_list())


@router.get("/fills")
async def get_fills(
    request: Request,
    _: SessionResponse = Depends(require_session),
):
    return success_response(request, _empty_list())


@router.get("/real-positions")
async def get_real_positions(
    request: Request,
    _: SessionResponse = Depends(require_session),
):
    return success_response(request, _empty_list())


@router.get("/virtual-positions")
async def get_virtual_positions(
    request: Request,
    _: SessionResponse = Depends(require_session),
):
    return success_response(request, _empty_list())
