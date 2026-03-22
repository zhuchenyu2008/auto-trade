import time
from collections.abc import Iterator

import pytest
from argon2 import PasswordHasher
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client() -> Iterator[TestClient]:
    from app.core.config import get_settings

    get_settings.cache_clear()

    import os

    os.environ["POSTGRES_DSN"] = "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/auto_trade"
    os.environ["REDIS_URL"] = "redis://127.0.0.1:6379/15"
    os.environ["OWNER_PASSWORD_HASH"] = PasswordHasher().hash("123456")
    os.environ["AUTO_CREATE_SCHEMA"] = "true"
    os.environ["LOGIN_LOCK_THRESHOLD"] = "3"
    os.environ["LOGIN_LOCK_DURATION_SECONDS"] = "2"
    os.environ["LOGIN_RATE_LIMIT_MAX_REQUESTS"] = "50"
    os.environ["LOGIN_RATE_LIMIT_WINDOW_SECONDS"] = "60"

    get_settings.cache_clear()
    from app.main import create_app

    app = create_app()
    with TestClient(app) as tc:
        yield tc


def test_health_endpoints(client: TestClient) -> None:
    live = client.get("/health/live")
    ready = client.get("/health/ready")
    deps = client.get("/health/deps")

    assert live.status_code == 200
    assert live.json()["status"] == "live"

    assert ready.status_code == 200
    assert ready.json()["status"] == "ready"
    assert ready.json()["checks"]["postgres"] == "ok"
    assert ready.json()["checks"]["redis"] == "ok"

    assert deps.status_code == 200
    dep_status = {item["name"]: item["status"] for item in deps.json()["dependencies"]}
    assert dep_status["postgres"] == "ok"
    assert dep_status["redis"] == "ok"


def test_auth_settings_logs_and_sse(client: TestClient) -> None:
    for _ in range(2):
        bad = client.post("/api/v1/auth/login", json={"password": "000000"})
        assert bad.status_code == 401
        assert bad.json()["error"]["code"] == "AUTH_INVALID_PASSWORD"

    locked = client.post("/api/v1/auth/login", json={"password": "000000"})
    assert locked.status_code == 423
    assert locked.json()["error"]["code"] == "AUTH_ACCOUNT_LOCKED"

    time.sleep(2.2)

    login = client.post("/api/v1/auth/login", json={"password": "123456"})
    assert login.status_code == 200
    assert login.json()["data"]["authenticated"] is True

    session = client.get("/api/v1/auth/session")
    assert session.status_code == 200
    assert session.json()["data"]["authenticated"] is True

    current_settings = client.get("/api/v1/settings/runtime")
    assert current_settings.status_code == 200
    current_payload = current_settings.json()["data"]

    update_payload = {
        "environment": "paper",
        "global_trading_enabled": True,
        "model": "gpt-5.4",
        "reasoning_level": "high",
        "default_leverage": "25",
        "manual_confirmation_threshold": "0.66",
        "context_window_size": 12,
        "new_position_capital_range": {"min": "0.40", "max": "0.80"},
    }
    updated = client.put("/api/v1/settings/runtime", json=update_payload)
    assert updated.status_code == 200
    assert updated.json()["data"]["context_window_size"] == 12
    assert updated.json()["data"]["reasoning_level"] == "high"

    logs = client.get("/api/v1/logs?limit=20")
    assert logs.status_code == 200
    items = logs.json()["data"]["items"]
    assert len(items) >= 1
    sample = items[0]
    for field in ("timestamp", "level", "module", "environment", "message", "correlation_id"):
        assert field in sample

    logout = client.post("/api/v1/auth/logout")
    assert logout.status_code == 200
    assert logout.json()["data"]["success"] is True

    after_logout = client.get("/api/v1/auth/session")
    assert after_logout.status_code == 401
    assert after_logout.json()["error"]["code"] in {"UNAUTHORIZED", "AUTH_SESSION_EXPIRED"}

    restore_payload = {
        "environment": current_payload["environment"],
        "global_trading_enabled": current_payload["global_trading_enabled"],
        "model": current_payload["model"],
        "reasoning_level": current_payload["reasoning_level"],
        "default_leverage": current_payload["default_leverage"],
        "manual_confirmation_threshold": current_payload["manual_confirmation_threshold"],
        "context_window_size": current_payload["context_window_size"],
        "new_position_capital_range": current_payload["new_position_capital_range"],
    }
    restore = client.put("/api/v1/settings/runtime", json=restore_payload)
    assert restore.status_code in {200, 401}


def test_session_expired_returns_unauthorized() -> None:
    from app.core.config import get_settings

    get_settings.cache_clear()

    import os

    os.environ["POSTGRES_DSN"] = "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/auto_trade"
    os.environ["REDIS_URL"] = "redis://127.0.0.1:6379/14"
    os.environ["OWNER_PASSWORD_HASH"] = PasswordHasher().hash("123456")
    os.environ["AUTO_CREATE_SCHEMA"] = "true"
    os.environ["SESSION_TTL_MINUTES"] = "0"
    os.environ["LOGIN_LOCK_THRESHOLD"] = "3"
    os.environ["LOGIN_LOCK_DURATION_SECONDS"] = "2"
    os.environ["LOGIN_RATE_LIMIT_MAX_REQUESTS"] = "50"
    os.environ["LOGIN_RATE_LIMIT_WINDOW_SECONDS"] = "60"

    get_settings.cache_clear()
    from app.main import create_app

    app = create_app()
    with TestClient(app) as tc:
        login = tc.post("/api/v1/auth/login", json={"password": "123456"})
        assert login.status_code == 200

        session = tc.get("/api/v1/auth/session")
        assert session.status_code == 401
        assert session.json()["error"]["code"] in {"UNAUTHORIZED", "AUTH_SESSION_EXPIRED"}
