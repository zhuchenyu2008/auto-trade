from __future__ import annotations

import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncEngine

from app.api.response import error_response
from app.api.routes import auth, compat, events, health, intake, logs, settings as settings_routes
from app.core.config import Settings, get_settings
from app.core.context import (
    CORRELATION_ID_HEADER,
    CORRELATION_ID_STATE,
    REQUEST_ID_HEADER,
    REQUEST_ID_STATE,
    create_correlation_id,
    create_request_id,
    get_correlation_id,
    get_request_id,
)
from app.core.errors import AppError, ErrorCodes
from app.core.logging import configure_logging, get_logger
from app.core.security import utc_now
from app.db.base import Base
from app.db.session import create_engine, create_session_factory
from app.realtime.sse_hub import SSEHub
from app.services.auth_service import AuthService
from app.services.events_service import EventsService
from app.services.intake_service import IntakeService
from app.services.intake_scheduler import IntakeScheduler
from app.services.logs_service import LogsService
from app.services.settings_service import SettingsService

# Ensure SQLAlchemy model metadata is loaded.
from app.db import models as _models  # noqa: F401

logger = get_logger("auto-trade.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings: Settings = app.state.settings
    db_engine: AsyncEngine = create_engine(settings.postgres_dsn)
    session_factory = create_session_factory(db_engine)
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    sse_hub = SSEHub()

    app.state.db_engine = db_engine
    app.state.session_factory = session_factory
    app.state.redis = redis
    app.state.sse_hub = sse_hub

    events_service = EventsService(sse_hub)
    logs_service = LogsService(events_service)
    settings_service = SettingsService(settings, logs_service, events_service)
    auth_service = AuthService(settings, settings_service, logs_service)
    intake_service = IntakeService(logs_service)
    intake_scheduler = IntakeScheduler(
        session_factory=session_factory,
        intake_service=intake_service,
        tick_seconds=max(0.1, float(settings.intake_scheduler_tick_seconds)),
    )

    app.state.events_service = events_service
    app.state.logs_service = logs_service
    app.state.settings_service = settings_service
    app.state.auth_service = auth_service
    app.state.intake_service = intake_service
    app.state.intake_scheduler = intake_scheduler

    if settings.auto_create_schema:
        async with db_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    intake_scheduler.start()
    logger.info("API startup completed")
    try:
        yield
    finally:
        await intake_scheduler.close()
        await sse_hub.close()
        await redis.aclose()
        await db_engine.dispose()
        logger.info("API shutdown completed")


def create_app() -> FastAPI:
    configure_logging()
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        lifespan=lifespan,
    )
    app.state.settings = settings

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def request_context_middleware(request: Request, call_next):
        request_id = request.headers.get(REQUEST_ID_HEADER, create_request_id())
        correlation_id = request.headers.get(CORRELATION_ID_HEADER, create_correlation_id())
        request.state.request_id = request_id
        request.state.correlation_id = correlation_id

        started_at = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = round((time.perf_counter() - started_at) * 1000, 2)

        response.headers[REQUEST_ID_HEADER] = request_id
        response.headers[CORRELATION_ID_HEADER] = correlation_id
        logger.info(
            "request.completed",
            extra={
                "request_id": request_id,
                "correlation_id": correlation_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": elapsed_ms,
            },
        )
        return response

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        return error_response(
            request,
            code=exc.code,
            message=exc.message,
            status_code=exc.status_code,
            details=exc.details,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError):
        return error_response(
            request,
            code="VALIDATION_ERROR",
            message="请求参数不符合要求。",
            status_code=422,
            details=exc.errors(),
        )

    @app.exception_handler(Exception)
    async def unknown_error_handler(request: Request, exc: Exception):
        logger.exception(
            "request.failed",
            extra={
                "request_id": get_request_id(request),
                "correlation_id": get_correlation_id(request),
                "path": request.url.path,
            },
        )
        return error_response(
            request,
            code=ErrorCodes.INTERNAL_ERROR,
            message="服务内部错误，请稍后重试。",
            status_code=500,
        )

    app.include_router(health.router)
    app.include_router(auth.router, prefix=settings.api_prefix)
    app.include_router(settings_routes.router, prefix=settings.api_prefix)
    app.include_router(logs.router, prefix=settings.api_prefix)
    app.include_router(events.router, prefix=settings.api_prefix)
    app.include_router(compat.router, prefix=settings.api_prefix)
    app.include_router(intake.router, prefix=settings.api_prefix)

    @app.get("/")
    async def index():
        return {
            "name": settings.app_name,
            "status": "ok",
            "server_time": utc_now().isoformat(),
            "request_state_keys": [REQUEST_ID_STATE, CORRELATION_ID_STATE],
        }

    return app


app = create_app()
