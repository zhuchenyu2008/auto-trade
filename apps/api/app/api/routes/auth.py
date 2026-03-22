from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    get_auth_service,
    get_db,
    get_redis,
    get_request_ctx,
    get_settings,
    require_session,
)
from app.api.response import success_response
from app.core.config import Settings
from app.core.context import RequestContext
from app.schemas.auth import LoginRequest, LogoutResponse, SessionResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login(
    payload: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
    request_context: RequestContext = Depends(get_request_ctx),
    auth_service: AuthService = Depends(get_auth_service),
    settings: Settings = Depends(get_settings),
):
    ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "")
    session_view, session_token = await auth_service.login(
        db,
        redis,
        password=payload.password,
        ip=ip,
        user_agent=user_agent,
        request_context=request_context,
    )
    response = success_response(request, session_view.model_dump(mode="json"))
    response.set_cookie(
        key=settings.session_cookie_name,
        value=session_token,
        httponly=True,
        secure=settings.session_secure_cookie,
        samesite=settings.session_samesite,
        max_age=settings.session_ttl_minutes * 60,
    )
    return response


@router.get("/session")
async def get_session(
    request: Request,
    session_view: SessionResponse = Depends(require_session),
):
    return success_response(request, session_view.model_dump(mode="json"))


@router.post("/logout")
async def logout(
    request: Request,
    db: AsyncSession = Depends(get_db),
    request_context: RequestContext = Depends(get_request_ctx),
    auth_service: AuthService = Depends(get_auth_service),
    settings: Settings = Depends(get_settings),
):
    token = request.cookies.get(settings.session_cookie_name)
    await auth_service.logout(db, session_token=token, request_context=request_context)
    response = success_response(request, LogoutResponse().model_dump())
    response.delete_cookie(settings.session_cookie_name)
    return response
