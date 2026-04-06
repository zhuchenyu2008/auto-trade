from __future__ import annotations

import os
from collections.abc import Iterator

import pytest
from argon2 import PasswordHasher
from fastapi.testclient import TestClient

from app.services.telegram_page_fetcher import FetchedTelegramPage


@pytest.fixture(scope="module")
def client() -> Iterator[TestClient]:
    from app.core.config import get_settings

    get_settings.cache_clear()
    os.environ["POSTGRES_DSN"] = "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/auto_trade"
    os.environ["REDIS_URL"] = "redis://127.0.0.1:6379/10"
    os.environ["OWNER_PASSWORD_HASH"] = PasswordHasher().hash("123456")
    os.environ["AUTO_CREATE_SCHEMA"] = "true"
    os.environ["SESSION_TTL_MINUTES"] = "30"
    os.environ["LOGIN_LOCK_THRESHOLD"] = "3"
    os.environ["LOGIN_LOCK_DURATION_SECONDS"] = "2"
    os.environ["LOGIN_RATE_LIMIT_MAX_REQUESTS"] = "50"
    os.environ["LOGIN_RATE_LIMIT_WINDOW_SECONDS"] = "60"

    get_settings.cache_clear()
    from app.main import create_app

    app = create_app()
    with TestClient(app) as tc:
        yield tc


def test_phase3_intake_create_and_sync_roundtrip(client: TestClient) -> None:
    html = """
    <div class="tgme_widget_message js-widget_message" data-post="cryptoninjas_trading_ann/1001" data-view="v1001">
      <div class="tgme_widget_message_text js-message_text">First signal</div>
      <time datetime="2026-04-06T10:00:00+00:00"></time>
    </div>
    <div class="tgme_widget_message js-widget_message" data-post="cryptoninjas_trading_ann/1002" data-view="v1002">
      <div class="tgme_widget_message_text js-message_text">Second signal</div>
      <time datetime="2026-04-06T10:10:00+00:00"></time>
    </div>
    """

    async def fake_fetch_channel_page(*, channel_username: str) -> FetchedTelegramPage:
        assert channel_username == "cryptoninjas_trading_ann"
        return FetchedTelegramPage(
            fetch_url="https://t.me/s/cryptoninjas_trading_ann",
            resolved_url="https://t.me/s/cryptoninjas_trading_ann",
            html_text=html,
            raw_payload_ref="/s/cryptoninjas_trading_ann",
        )

    client.app.state.intake_service._fetcher.fetch_channel_page = fake_fetch_channel_page  # type: ignore[assignment]

    login = client.post("/api/v1/auth/login", json={"password": "123456"})
    assert login.status_code == 200

    created = client.post(
        "/api/v1/intake/channels",
        json={
            "channel_name": "CryptoNinjas",
            "source_type": "telegram_web",
            "source_ref": "https://t.me/cryptoninjas_trading_ann",
        },
    )
    assert created.status_code == 201
    channel_id = created.json()["data"]["channel_id"]

    first_sync = client.post(f"/api/v1/intake/channels/{channel_id}/sync")
    assert first_sync.status_code == 200
    first_data = first_sync.json()["data"]
    assert first_data["fetched_count"] == 2
    assert first_data["new_count"] == 2
    assert first_data["edited_count"] == 0
    assert first_data["unchanged_count"] == 0
    assert first_data["last_seen_source_message_id"] == "1002"

    second_sync = client.post(f"/api/v1/intake/channels/{channel_id}/sync")
    assert second_sync.status_code == 200
    second_data = second_sync.json()["data"]
    assert second_data["fetched_count"] == 2
    assert second_data["new_count"] == 0
    assert second_data["edited_count"] == 0
    assert second_data["unchanged_count"] == 2

    channels = client.get("/api/v1/intake/channels")
    assert channels.status_code == 200
    items = channels.json()["data"]["items"]
    matched = next(item for item in items if item["channel_id"] == channel_id)
    assert matched["source_username"] == "cryptoninjas_trading_ann"
    assert matched["cursor"]["last_processed_source_message_id"] == "1002"
