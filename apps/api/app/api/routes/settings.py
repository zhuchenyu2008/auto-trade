from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_request_ctx, get_settings_service, require_session
from app.api.response import success_response
from app.core.context import RequestContext
from app.schemas.auth import SessionResponse
from app.schemas.settings import RuntimeSettingsUpdateRequest
from app.services.settings_service import SettingsService

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/runtime")
async def get_runtime_settings(
    request: Request,
    _: SessionResponse = Depends(require_session),
    db: AsyncSession = Depends(get_db),
    settings_service: SettingsService = Depends(get_settings_service),
):
    data = await settings_service.get_runtime_settings(db)
    return success_response(request, data.model_dump(mode="json"))


@router.put("/runtime")
async def update_runtime_settings(
    payload: RuntimeSettingsUpdateRequest,
    request: Request,
    _: SessionResponse = Depends(require_session),
    db: AsyncSession = Depends(get_db),
    request_context: RequestContext = Depends(get_request_ctx),
    settings_service: SettingsService = Depends(get_settings_service),
):
    data = await settings_service.update_runtime_settings(
        db,
        payload=payload,
        request_context=request_context,
    )
    return success_response(request, data.model_dump(mode="json"))
