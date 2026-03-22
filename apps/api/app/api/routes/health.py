from __future__ import annotations

import asyncio

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from redis.exceptions import RedisError

from app.core.security import utc_now
from app.db.session import check_postgres

router = APIRouter(prefix="/health", tags=["health"])


async def _check_redis(redis_client) -> bool:
    try:
        pong = await redis_client.ping()
        return bool(pong)
    except RedisError:
        return False


@router.get("/live")
async def health_live():
    return {"status": "live"}


@router.get("/ready")
async def health_ready(request: Request):
    postgres_ok, redis_ok = await asyncio.gather(
        check_postgres(request.app.state.db_engine),
        _check_redis(request.app.state.redis),
    )
    ready = postgres_ok and redis_ok
    payload = {
        "status": "ready" if ready else "not_ready",
        "checks": {
            "postgres": "ok" if postgres_ok else "down",
            "redis": "ok" if redis_ok else "down",
        },
    }
    status_code = 200 if ready else 503
    return JSONResponse(status_code=status_code, content=payload)


@router.get("/deps")
async def health_deps(request: Request):
    checked_at = utc_now().isoformat()
    postgres_ok, redis_ok = await asyncio.gather(
        check_postgres(request.app.state.db_engine),
        _check_redis(request.app.state.redis),
    )
    return {
        "dependencies": [
            {
                "name": "postgres",
                "status": "ok" if postgres_ok else "down",
                "checked_at": checked_at,
            },
            {
                "name": "redis",
                "status": "ok" if redis_ok else "down",
                "checked_at": checked_at,
            },
        ]
    }
