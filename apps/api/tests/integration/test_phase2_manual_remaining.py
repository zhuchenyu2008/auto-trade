from __future__ import annotations

import os
import socket
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import httpx
from argon2 import PasswordHasher


@dataclass
class LiveApiServer:
    host: str
    port: int
    base_url: str
    process: subprocess.Popen[bytes]


def _is_port_open(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.2)
        return sock.connect_ex((host, port)) == 0


def _wait_live(base_url: str, timeout_seconds: float = 25.0) -> None:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            response = httpx.get(f"{base_url}/health/live", timeout=1.5)
            if response.status_code == 200:
                return
        except Exception:
            pass
        time.sleep(0.3)
    raise AssertionError("uvicorn did not become ready in time")


def _wait_port_closed(host: str, port: int, timeout_seconds: float = 10.0) -> None:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        if not _is_port_open(host, port):
            return
        time.sleep(0.2)
    raise AssertionError(f"Port {port} is still listening after shutdown")


def _start_live_api(
    *,
    host: str,
    port: int,
    redis_db: int,
    lock_threshold: int = 3,
    lock_duration_seconds: int = 2,
) -> LiveApiServer:
    assert not _is_port_open(host, port), f"Port {port} is in use, cannot start isolated live test"

    api_dir = Path(__file__).resolve().parents[2]
    base_url = f"http://{host}:{port}"
    env = os.environ.copy()
    env["POSTGRES_DSN"] = "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/auto_trade"
    env["REDIS_URL"] = f"redis://127.0.0.1:6379/{redis_db}"
    env["OWNER_PASSWORD_HASH"] = PasswordHasher().hash("123456")
    env["AUTO_CREATE_SCHEMA"] = "true"
    env["SESSION_TTL_MINUTES"] = "30"
    env["LOGIN_RATE_LIMIT_MAX_REQUESTS"] = "50"
    env["LOGIN_RATE_LIMIT_WINDOW_SECONDS"] = "60"
    env["LOGIN_LOCK_THRESHOLD"] = str(lock_threshold)
    env["LOGIN_LOCK_DURATION_SECONDS"] = str(lock_duration_seconds)
    env["CORS_ORIGINS"] = "http://127.0.0.1:5173"

    process = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            host,
            "--port",
            str(port),
        ],
        cwd=str(api_dir),
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.STDOUT,
    )
    _wait_live(base_url)
    return LiveApiServer(host=host, port=port, base_url=base_url, process=process)


def _stop_live_api(server: LiveApiServer) -> None:
    server.process.terminate()
    try:
        server.process.wait(timeout=8)
    except subprocess.TimeoutExpired:
        server.process.kill()
        server.process.wait(timeout=8)
    _wait_port_closed(server.host, server.port)


def _runtime_to_update_payload(runtime_settings: dict[str, Any]) -> dict[str, Any]:
    return {
        "environment": runtime_settings["environment"],
        "global_trading_enabled": runtime_settings["global_trading_enabled"],
        "model": runtime_settings["model"],
        "reasoning_level": runtime_settings["reasoning_level"],
        "default_leverage": runtime_settings["default_leverage"],
        "manual_confirmation_threshold": runtime_settings["manual_confirmation_threshold"],
        "context_window_size": runtime_settings["context_window_size"],
        "new_position_capital_range": {
            "min": runtime_settings["new_position_capital_range"]["min"],
            "max": runtime_settings["new_position_capital_range"]["max"],
        },
    }


def test_service_can_restart_and_runtime_settings_persist() -> None:
    host = "127.0.0.1"
    port = 18081
    redis_db = 12
    original_runtime: dict[str, Any] | None = None
    probe_model = f"gpt-5.4-phase2-restart-{int(time.time())}"

    server = _start_live_api(host=host, port=port, redis_db=redis_db)
    try:
        with httpx.Client(base_url=server.base_url, timeout=6.0) as client:
            assert client.get("/health/live").status_code == 200
            assert client.get("/health/ready").status_code == 200

            login = client.post("/api/v1/auth/login", json={"password": "123456"})
            assert login.status_code == 200

            runtime = client.get("/api/v1/settings/runtime")
            assert runtime.status_code == 200
            original_runtime = runtime.json()["data"]

            update_payload = _runtime_to_update_payload(original_runtime)
            update_payload["model"] = probe_model
            update_payload["context_window_size"] = min(120, int(update_payload["context_window_size"]) + 1)

            updated = client.put("/api/v1/settings/runtime", json=update_payload)
            assert updated.status_code == 200
            assert updated.json()["data"]["model"] == probe_model
    finally:
        _stop_live_api(server)

    restarted = _start_live_api(host=host, port=port, redis_db=redis_db)
    try:
        with httpx.Client(base_url=restarted.base_url, timeout=6.0) as client:
            assert client.get("/health/live").status_code == 200
            assert client.get("/health/ready").status_code == 200

            relogin = client.post("/api/v1/auth/login", json={"password": "123456"})
            assert relogin.status_code == 200

            runtime_after_restart = client.get("/api/v1/settings/runtime")
            assert runtime_after_restart.status_code == 200
            assert runtime_after_restart.json()["data"]["model"] == probe_model

            if original_runtime is not None:
                restore_payload = _runtime_to_update_payload(original_runtime)
                restored = client.put("/api/v1/settings/runtime", json=restore_payload)
                assert restored.status_code == 200
    finally:
        _stop_live_api(restarted)


def test_auth_and_basic_phase2_workflow_roundtrip() -> None:
    host = "127.0.0.1"
    port = 18082
    redis_db = 11
    unique_model = f"gpt-5.4-phase2-flow-{int(time.time())}"

    server = _start_live_api(
        host=host,
        port=port,
        redis_db=redis_db,
        lock_threshold=3,
        lock_duration_seconds=2,
    )
    try:
        with httpx.Client(base_url=server.base_url, timeout=6.0) as client:
            bad_1 = client.post("/api/v1/auth/login", json={"password": "000000"})
            bad_2 = client.post("/api/v1/auth/login", json={"password": "000000"})
            locked = client.post("/api/v1/auth/login", json={"password": "000000"})
            assert bad_1.status_code == 401
            assert bad_2.status_code == 401
            assert locked.status_code == 423

            time.sleep(2.2)

            login = client.post("/api/v1/auth/login", json={"password": "123456"})
            assert login.status_code == 200

            session = client.get("/api/v1/auth/session")
            assert session.status_code == 200

            runtime = client.get("/api/v1/settings/runtime")
            assert runtime.status_code == 200
            update_payload = _runtime_to_update_payload(runtime.json()["data"])
            update_payload["model"] = unique_model
            updated = client.put("/api/v1/settings/runtime", json=update_payload)
            assert updated.status_code == 200
            assert updated.json()["data"]["model"] == unique_model

            logs = client.get("/api/v1/logs?limit=50")
            assert logs.status_code == 200
            items = logs.json()["data"]["items"]
            assert any(item["message"] == "运行时设置已更新" for item in items)

            created = client.post(
                "/api/v1/channels",
                json={
                    "channel_name": "Phase2连通性频道",
                    "source_type": "telegram_web",
                    "source_ref": "https://t.me/s/phase2_check",
                },
            )
            assert created.status_code == 201
            channel_id = created.json()["data"]["channel_id"]

            disabled = client.patch(f"/api/v1/channels/{channel_id}", json={"status": "disabled"})
            assert disabled.status_code == 200
            assert disabled.json()["data"]["status"] == "disabled"

            channels = client.get("/api/v1/channels")
            assert channels.status_code == 200
            returned = channels.json()["data"]["items"]
            assert any(item["channel_id"] == channel_id and item["status"] == "disabled" for item in returned)

            overview = client.get("/api/v1/overview/summary")
            assert overview.status_code == 200

            logout = client.post("/api/v1/auth/logout")
            assert logout.status_code == 200

            after_logout = client.get("/api/v1/auth/session")
            assert after_logout.status_code == 401
    finally:
        _stop_live_api(server)
