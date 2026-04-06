from __future__ import annotations

from collections.abc import AsyncIterator

from fastapi import Depends, Request
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import Settings
from app.core.context import RequestContext, get_request_context
from app.schemas.auth import SessionResponse
from app.services.auth_service import AuthService
from app.services.events_service import EventsService
from app.services.intake_service import IntakeService
from app.services.logs_service import LogsService
from app.services.settings_service import SettingsService


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_redis(request: Request) -> Redis:
    return request.app.state.redis


async def get_db(request: Request) -> AsyncIterator[AsyncSession]:
    session_factory: async_sessionmaker[AsyncSession] = request.app.state.session_factory
    async with session_factory() as session:
        yield session


def get_request_ctx(request: Request) -> RequestContext:
    return get_request_context(request)


def get_auth_service(request: Request) -> AuthService:
    return request.app.state.auth_service


def get_settings_service(request: Request) -> SettingsService:
    return request.app.state.settings_service


def get_logs_service(request: Request) -> LogsService:
    return request.app.state.logs_service


def get_intake_service(request: Request) -> IntakeService:
    return request.app.state.intake_service


def get_events_service(request: Request) -> EventsService:
    return request.app.state.events_service


async def require_session(
    request: Request,
    db: AsyncSession = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service),
    settings: Settings = Depends(get_settings),
) -> SessionResponse:
    token = request.cookies.get(settings.session_cookie_name)
    return await auth_service.resolve_session(db, session_token=token)
