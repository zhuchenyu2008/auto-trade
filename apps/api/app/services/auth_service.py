from __future__ import annotations

from datetime import timedelta
from http import HTTPStatus

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.context import RequestContext
from app.core.errors import AppError, ErrorCodes
from app.core.rate_limit import LoginGuard
from app.core.security import ensure_password_format, hash_text, utc_now, verify_owner_password
from app.core.session import create_session_id, create_session_token, hash_session_token
from app.db.repositories import AuditRepository, AuthSessionRepository
from app.schemas.auth import SessionResponse
from app.services.logs_service import LogsService
from app.services.settings_service import SettingsService


class AuthService:
    def __init__(
        self,
        settings: Settings,
        settings_service: SettingsService,
        logs_service: LogsService,
    ) -> None:
        self._settings = settings
        self._settings_service = settings_service
        self._logs_service = logs_service
        self._session_repo = AuthSessionRepository()
        self._audit_repo = AuditRepository()

    async def _build_session_response(
        self,
        db: AsyncSession,
        *,
        expires_at,
    ) -> SessionResponse:
        runtime = await self._settings_service.get_runtime_settings(db)
        return SessionResponse(
            authenticated=True,
            environment=runtime.environment,
            global_trading_enabled=runtime.global_trading_enabled,
            health_status="healthy",
            pending_manual_confirmation_count=0,
            session_expires_at=expires_at,
        )

    async def login(
        self,
        db: AsyncSession,
        redis: Redis,
        *,
        password: str,
        ip: str,
        user_agent: str,
        request_context: RequestContext,
    ) -> tuple[SessionResponse, str]:
        ensure_password_format(password)
        guard = LoginGuard(redis, self._settings)
        await guard.ensure_rate_limit(ip)

        lock_remaining = await guard.get_lock_remaining_seconds()
        if lock_remaining > 0:
            raise AppError(
                code=ErrorCodes.AUTH_ACCOUNT_LOCKED,
                message="账户已临时锁定，请稍后再试。",
                status_code=HTTPStatus.LOCKED,
                details={"lock_remaining_seconds": lock_remaining},
            )

        password_hash = self._settings.owner_password_hash.get_secret_value()
        verified = verify_owner_password(password, password_hash)
        now = utc_now()
        runtime = await self._settings_service.get_runtime_settings(db)

        if not verified:
            lock_seconds = await guard.register_failed_login()
            await self._audit_repo.append_action(
                db,
                action="auth.login",
                target_type="session",
                target_id="owner",
                result="failed",
                operator_source=request_context.operator_source,
                request_id=request_context.request_id,
                correlation_id=request_context.correlation_id,
                idempotency_key=request_context.idempotency_key,
                detail={"ip_hash": hash_text(ip)},
                message="登录失败",
            )
            await self._logs_service.append_log(
                db,
                timestamp=now,
                level="warning",
                module="auth-core",
                environment=runtime.environment,
                message="登录失败：密码错误",
                correlation_id=request_context.correlation_id,
                request_id=request_context.request_id,
            )
            await db.commit()
            if lock_seconds > 0:
                raise AppError(
                    code=ErrorCodes.AUTH_ACCOUNT_LOCKED,
                    message="连续失败已触发临时锁定。",
                    status_code=HTTPStatus.LOCKED,
                    details={"lock_remaining_seconds": lock_seconds},
                )
            raise AppError(
                code=ErrorCodes.AUTH_INVALID_PASSWORD,
                message="密码错误。",
                status_code=HTTPStatus.UNAUTHORIZED,
            )

        await guard.clear_failed_login()

        session_id = create_session_id()
        token = create_session_token()
        token_hash = hash_session_token(token)
        expires_at = now + timedelta(minutes=self._settings.session_ttl_minutes)
        await self._session_repo.create(
            db,
            session_id=session_id,
            token_hash=token_hash,
            issued_at=now,
            expires_at=expires_at,
            ip_hash=hash_text(ip),
            user_agent_hash=hash_text(user_agent),
        )
        await self._audit_repo.append_action(
            db,
            action="auth.login",
            target_type="session",
            target_id=session_id,
            result="success",
            operator_source=request_context.operator_source,
            request_id=request_context.request_id,
            correlation_id=request_context.correlation_id,
            idempotency_key=request_context.idempotency_key,
            detail={"ip_hash": hash_text(ip)},
            message="登录成功",
        )
        await self._logs_service.append_log(
            db,
            timestamp=now,
            level="info",
            module="auth-core",
            environment=runtime.environment,
            message="登录成功",
            correlation_id=request_context.correlation_id,
            request_id=request_context.request_id,
        )
        await db.commit()

        response = await self._build_session_response(db, expires_at=expires_at)
        return response, token

    async def resolve_session(
        self,
        db: AsyncSession,
        *,
        session_token: str | None,
    ) -> SessionResponse:
        if not session_token:
            raise AppError(
                code=ErrorCodes.UNAUTHORIZED,
                message="会话已失效，请重新登录。",
                status_code=HTTPStatus.UNAUTHORIZED,
            )

        token_hash = hash_session_token(session_token)
        now = utc_now()
        session = await self._session_repo.get_active_by_token_hash(db, token_hash=token_hash, now=now)
        if session is None:
            raise AppError(
                code=ErrorCodes.AUTH_SESSION_EXPIRED,
                message="会话已过期，请重新登录。",
                status_code=HTTPStatus.UNAUTHORIZED,
            )
        await self._session_repo.touch(db, session, now=now)
        await db.commit()
        return await self._build_session_response(db, expires_at=session.expires_at)

    async def logout(
        self,
        db: AsyncSession,
        *,
        session_token: str | None,
        request_context: RequestContext,
    ) -> None:
        if not session_token:
            return
        token_hash = hash_session_token(session_token)
        now = utc_now()
        session = await self._session_repo.revoke_by_token_hash(
            db,
            token_hash=token_hash,
            now=now,
            reason="logout",
        )
        if session is None:
            return
        runtime = await self._settings_service.get_runtime_settings(db)
        await self._audit_repo.append_action(
            db,
            action="auth.logout",
            target_type="session",
            target_id=session.session_id,
            result="success",
            operator_source=request_context.operator_source,
            request_id=request_context.request_id,
            correlation_id=request_context.correlation_id,
            idempotency_key=request_context.idempotency_key,
            message="会话登出",
        )
        await self._logs_service.append_log(
            db,
            timestamp=now,
            level="info",
            module="auth-core",
            environment=runtime.environment,
            message="用户已登出",
            correlation_id=request_context.correlation_id,
            request_id=request_context.request_id,
        )
        await db.commit()
