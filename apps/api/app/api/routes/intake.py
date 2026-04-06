from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_intake_service, get_request_ctx, require_session
from app.api.response import success_response
from app.core.context import RequestContext
from app.core.errors import AppError
from app.schemas.auth import SessionResponse
from app.services.intake_service import IntakeService

router = APIRouter(tags=["intake"])


@router.get("/intake/channels")
async def list_intake_channels(
    request: Request,
    _: SessionResponse = Depends(require_session),
    db: AsyncSession = Depends(get_db),
    intake_service: IntakeService = Depends(get_intake_service),
):
    items = await intake_service.list_channels(db)
    return success_response(
        request,
        {
            "items": items,
            "page": {"next_cursor": None, "has_more": False},
        },
    )


@router.post("/intake/channels")
async def create_intake_channel(
    request: Request,
    payload: dict[str, Any] = Body(...),
    _: SessionResponse = Depends(require_session),
    db: AsyncSession = Depends(get_db),
    request_context: RequestContext = Depends(get_request_ctx),
    intake_service: IntakeService = Depends(get_intake_service),
):
    item = await intake_service.create_channel(
        db,
        channel_name=payload.get("channel_name"),
        source_type=payload.get("source_type"),
        source_ref=payload.get("source_ref"),
        status=payload.get("status"),
        poll_interval_seconds=payload.get("poll_interval_seconds"),
        request_context=request_context,
    )
    await db.commit()
    return success_response(request, item, status_code=201)


@router.patch("/intake/channels/{channel_id}")
async def patch_intake_channel(
    channel_id: str,
    request: Request,
    payload: dict[str, Any] = Body(...),
    _: SessionResponse = Depends(require_session),
    db: AsyncSession = Depends(get_db),
    request_context: RequestContext = Depends(get_request_ctx),
    intake_service: IntakeService = Depends(get_intake_service),
):
    item = await intake_service.patch_channel(
        db,
        channel_id=channel_id,
        payload=payload,
        request_context=request_context,
    )
    await db.commit()
    return success_response(request, item)


@router.post("/intake/channels/{channel_id}/sync")
async def sync_intake_channel(
    channel_id: str,
    request: Request,
    _: SessionResponse = Depends(require_session),
    db: AsyncSession = Depends(get_db),
    request_context: RequestContext = Depends(get_request_ctx),
    intake_service: IntakeService = Depends(get_intake_service),
):
    try:
        summary = await intake_service.sync_channel_once(
            db,
            channel_id=channel_id,
            request_context=request_context,
        )
        await db.commit()
    except AppError:
        await db.commit()
        raise

    return success_response(
        request,
        {
            "channel_id": channel_id,
            "fetched_count": summary.fetched_count,
            "new_count": summary.new_count,
            "edited_count": summary.edited_count,
            "unchanged_count": summary.unchanged_count,
            "last_seen_source_message_id": summary.last_seen_source_message_id,
            "last_processed_source_message_id": summary.last_processed_source_message_id,
        },
    )
