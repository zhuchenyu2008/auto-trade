from __future__ import annotations

import json
import os
import socket
import subprocess
import sys
import time
from pathlib import Path

import httpx
from argon2 import PasswordHasher


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


def test_sse_heartbeat_contract_with_live_server() -> None:
    host = "127.0.0.1"
    port = 18080
    base_url = f"http://{host}:{port}"
    assert not _is_port_open(host, port), f"Port {port} is in use, cannot start isolated SSE test"

    api_dir = Path(__file__).resolve().parents[2]
    env = os.environ.copy()
    env["POSTGRES_DSN"] = "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/auto_trade"
    env["REDIS_URL"] = "redis://127.0.0.1:6379/13"
    env["OWNER_PASSWORD_HASH"] = PasswordHasher().hash("123456")
    env["AUTO_CREATE_SCHEMA"] = "true"
    env["SESSION_TTL_MINUTES"] = "30"
    env["LOGIN_RATE_LIMIT_MAX_REQUESTS"] = "50"
    env["LOGIN_RATE_LIMIT_WINDOW_SECONDS"] = "60"
    env["LOGIN_LOCK_THRESHOLD"] = "5"
    env["LOGIN_LOCK_DURATION_SECONDS"] = "30"
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

    try:
        _wait_live(base_url)
        with httpx.Client(base_url=base_url, timeout=5.0) as client:
            login = client.post("/api/v1/auth/login", json={"password": "123456"})
            assert login.status_code == 200

            with client.stream("GET", "/api/v1/events/stream", timeout=10.0) as stream:
                assert stream.status_code == 200
                content_type = stream.headers.get("content-type", "")
                assert "text/event-stream" in content_type

                first_event = None
                deadline = time.time() + 8.0
                for line in stream.iter_lines():
                    if time.time() > deadline:
                        break
                    if not line:
                        continue
                    if isinstance(line, bytes):
                        line = line.decode("utf-8")
                    if not line.startswith("data: "):
                        continue
                    first_event = json.loads(line[6:])
                    break

                assert first_event is not None
                assert first_event["event_type"] == "system.heartbeat"
                assert "occurred_at" in first_event
                assert isinstance(first_event.get("payload"), dict)
    finally:
        process.terminate()
        try:
            process.wait(timeout=8)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=8)
