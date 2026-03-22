from __future__ import annotations

from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.core.config import Settings
from app.core.errors import AppError, ErrorCodes
from app.core.security import utc_now


class LoginGuard:
    def __init__(self, redis: Redis, settings: Settings) -> None:
        self._redis = redis
        self._settings = settings

    def _rate_key(self, ip: str) -> str:
        return f"auth:rate:login:{ip}"

    @staticmethod
    def _fail_key() -> str:
        return "auth:fail:owner"

    @staticmethod
    def _lock_key() -> str:
        return "auth:lock:owner:until"

    async def ensure_rate_limit(self, ip: str) -> None:
        try:
            key = self._rate_key(ip)
            pipe = self._redis.pipeline()
            pipe.incr(key)
            pipe.expire(key, self._settings.login_rate_limit_window_seconds, nx=True)
            result = await pipe.execute()
            count = int(result[0])
        except RedisError as exc:
            raise AppError(
                code=ErrorCodes.DEPENDENCY_UNAVAILABLE,
                message="登录保护服务不可用，请稍后再试。",
                status_code=503,
            ) from exc
        if count > self._settings.login_rate_limit_max_requests:
            raise AppError(
                code=ErrorCodes.AUTH_RATE_LIMITED,
                message="登录请求过于频繁，请稍后重试。",
                status_code=429,
            )

    async def get_lock_remaining_seconds(self) -> int:
        try:
            lock_until_value = await self._redis.get(self._lock_key())
        except RedisError as exc:
            raise AppError(
                code=ErrorCodes.DEPENDENCY_UNAVAILABLE,
                message="登录保护服务不可用，请稍后再试。",
                status_code=503,
            ) from exc
        if not lock_until_value:
            return 0
        lock_until = int(lock_until_value)
        now = int(utc_now().timestamp())
        return max(0, lock_until - now)

    async def register_failed_login(self) -> int:
        try:
            fail_key = self._fail_key()
            fail_count = int(await self._redis.incr(fail_key))
            if fail_count == 1:
                await self._redis.expire(
                    fail_key,
                    self._settings.login_lock_duration_seconds,
                )
            if fail_count < self._settings.login_lock_threshold:
                return 0

            lock_until = int(utc_now().timestamp()) + self._settings.login_lock_duration_seconds
            await self._redis.set(
                self._lock_key(),
                str(lock_until),
                ex=self._settings.login_lock_duration_seconds,
            )
            await self._redis.delete(fail_key)
            return self._settings.login_lock_duration_seconds
        except RedisError as exc:
            raise AppError(
                code=ErrorCodes.DEPENDENCY_UNAVAILABLE,
                message="登录保护服务不可用，请稍后再试。",
                status_code=503,
            ) from exc

    async def clear_failed_login(self) -> None:
        try:
            await self._redis.delete(self._fail_key())
        except RedisError as exc:
            raise AppError(
                code=ErrorCodes.DEPENDENCY_UNAVAILABLE,
                message="登录保护服务不可用，请稍后再试。",
                status_code=503,
            ) from exc
