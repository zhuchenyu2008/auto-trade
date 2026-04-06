from __future__ import annotations

import os
import time
from collections.abc import Iterator

import pytest
from argon2 import PasswordHasher
from fastapi.testclient import TestClient
from sqlalchemy import func, select, update

from app.core.errors import AppError, ErrorCodes
from app.db.models import Channel, ChannelSource, MessageVersion, NormalizedMessage, RawMessage, SourceCursor
from app.db.session import create_engine, create_session_factory
from app.services.telegram_page_fetcher import FetchedTelegramPage


def _wait_until(predicate, *, timeout_seconds: float = 8.0, interval_seconds: float = 0.2) -> bool:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        if predicate():
            return True
        time.sleep(interval_seconds)
    return False


def _db_get_channel_pk_and_cursor(channel_id: str) -> tuple[int | None, int]:
    async def _run() -> tuple[int | None, int]:
        engine = create_engine("postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/auto_trade")
        sf = create_session_factory(engine)
        async with sf() as db:
            channel = (await db.execute(select(Channel).where(Channel.channel_id == channel_id))).scalar_one_or_none()
            if channel is None:
                await engine.dispose()
                return None, 0
            cursor = (
                await db.execute(
                    select(SourceCursor).join(ChannelSource, SourceCursor.channel_source_pk == ChannelSource.id).where(
                        ChannelSource.channel_pk == channel.id
                    )
                )
            ).scalar_one_or_none()
            failures = int(cursor.consecutive_failures) if cursor is not None else 0
            await engine.dispose()
            return channel.id, failures

    import asyncio

    return asyncio.run(_run())


def _db_count_raw_messages(channel_pk: int) -> int:
    async def _run() -> int:
        engine = create_engine("postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/auto_trade")
        sf = create_session_factory(engine)
        async with sf() as db:
            count = (
                await db.execute(select(func.count()).select_from(RawMessage).where(RawMessage.channel_pk == channel_pk))
            ).scalar_one()
        await engine.dispose()
        return int(count)

    import asyncio

    return asyncio.run(_run())


def _db_counts_for_message_tables(channel_pk: int) -> tuple[int, int, int]:
    async def _run() -> tuple[int, int, int]:
        engine = create_engine("postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/auto_trade")
        sf = create_session_factory(engine)
        async with sf() as db:
            raw_count = (
                await db.execute(select(func.count()).select_from(RawMessage).where(RawMessage.channel_pk == channel_pk))
            ).scalar_one()
            normalized_count = (
                await db.execute(
                    select(func.count()).select_from(NormalizedMessage).where(NormalizedMessage.channel_pk == channel_pk)
                )
            ).scalar_one()
            version_count = (
                await db.execute(
                    select(func.count())
                    .select_from(MessageVersion)
                    .join(NormalizedMessage, MessageVersion.normalized_message_pk == NormalizedMessage.id)
                    .where(NormalizedMessage.channel_pk == channel_pk)
                )
            ).scalar_one()
        await engine.dispose()
        return int(raw_count), int(normalized_count), int(version_count)

    import asyncio

    return asyncio.run(_run())


@pytest.fixture(scope="module")
def client() -> Iterator[TestClient]:
    from app.core.config import get_settings

    get_settings.cache_clear()
    os.environ["POSTGRES_DSN"] = "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/auto_trade"
    os.environ["REDIS_URL"] = "redis://127.0.0.1:6379/6"
    os.environ["OWNER_PASSWORD_HASH"] = PasswordHasher().hash("123456")
    os.environ["AUTO_CREATE_SCHEMA"] = "true"
    os.environ["SESSION_TTL_MINUTES"] = "30"
    os.environ["LOGIN_LOCK_THRESHOLD"] = "3"
    os.environ["LOGIN_LOCK_DURATION_SECONDS"] = "2"
    os.environ["LOGIN_RATE_LIMIT_MAX_REQUESTS"] = "50"
    os.environ["LOGIN_RATE_LIMIT_WINDOW_SECONDS"] = "60"
    os.environ["INTAKE_SCHEDULER_TICK_SECONDS"] = "0.2"

    get_settings.cache_clear()
    from app.main import create_app

    app = create_app()
    with TestClient(app) as tc:
        yield tc


def test_scheduler_start_disable_and_failure_isolation(client: TestClient) -> None:
    async def fake_fetch_channel_page(*, channel_username: str) -> FetchedTelegramPage:
        if channel_username == "sched_fail_case":
            raise AppError(
                code=ErrorCodes.DEPENDENCY_UNAVAILABLE,
                message="mock failure",
                status_code=503,
            )
        html = f"""
        <div class="tgme_widget_message js-widget_message" data-post="{channel_username}/3001" data-view="v3001">
          <div class="tgme_widget_message_text js-message_text">scheduler-{channel_username}</div>
          <time datetime="2026-04-06T10:00:00+00:00"></time>
        </div>
        """
        return FetchedTelegramPage(
            fetch_url=f"https://t.me/s/{channel_username}",
            resolved_url=f"https://t.me/s/{channel_username}",
            html_text=html,
            raw_payload_ref=f"/s/{channel_username}",
        )

    client.app.state.intake_service._fetcher.fetch_channel_page = fake_fetch_channel_page  # type: ignore[assignment]

    login = client.post("/api/v1/auth/login", json={"password": "123456"})
    assert login.status_code == 200

    # Keep scheduler deterministic by disabling existing channels first.
    async def _disable_existing_channels() -> None:
        engine = create_engine("postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/auto_trade")
        sf = create_session_factory(engine)
        async with sf() as db:
            await db.execute(update(Channel).values(status="disabled"))
            await db.execute(update(ChannelSource).values(status="disabled"))
            await db.commit()
        await engine.dispose()

    import asyncio

    asyncio.run(_disable_existing_channels())

    created_ok = client.post(
        "/api/v1/intake/channels",
        json={
            "channel_name": "Scheduler OK",
            "source_type": "telegram_web",
            "source_ref": "@sched_ok_case",
            "status": "enabled",
            "poll_interval_seconds": 5,
        },
    )
    assert created_ok.status_code == 201
    ok_channel_id = created_ok.json()["data"]["channel_id"]

    ok_channel_pk, _ = _db_get_channel_pk_and_cursor(ok_channel_id)
    assert ok_channel_pk is not None
    ok_channel_pk = int(ok_channel_pk)

    # 1) 新增频道后无需重启即可开始抓取
    assert _wait_until(lambda: _db_count_raw_messages(ok_channel_pk) > 0, timeout_seconds=8.0)

    # 2) 停用频道后不再继续抓取
    before_disable_count = _db_count_raw_messages(ok_channel_pk)
    patched = client.patch(f"/api/v1/intake/channels/{ok_channel_id}", json={"status": "disabled"})
    assert patched.status_code == 200
    # Force scheduler to consider this channel immediately.
    client.app.state.intake_scheduler._next_run_by_channel_id[ok_channel_id] = 0.0  # type: ignore[attr-defined]
    time.sleep(1.5)
    after_disable_count = _db_count_raw_messages(ok_channel_pk)
    assert after_disable_count == before_disable_count

    # 3) 一个频道异常时，其他频道仍正常更新
    created_good = client.post(
        "/api/v1/intake/channels",
        json={
            "channel_name": "Scheduler Good",
            "source_type": "telegram_web",
            "source_ref": "@sched_good_case",
            "status": "enabled",
            "poll_interval_seconds": 5,
        },
    )
    assert created_good.status_code == 201
    good_channel_id = created_good.json()["data"]["channel_id"]

    created_fail = client.post(
        "/api/v1/intake/channels",
        json={
            "channel_name": "Scheduler Fail",
            "source_type": "telegram_web",
            "source_ref": "@sched_fail_case",
            "status": "enabled",
            "poll_interval_seconds": 5,
        },
    )
    assert created_fail.status_code == 201
    fail_channel_id = created_fail.json()["data"]["channel_id"]

    good_pk, _ = _db_get_channel_pk_and_cursor(good_channel_id)
    fail_pk, _ = _db_get_channel_pk_and_cursor(fail_channel_id)
    assert good_pk is not None
    assert fail_pk is not None
    good_pk = int(good_pk)
    fail_pk = int(fail_pk)

    client.app.state.intake_scheduler._next_run_by_channel_id[good_channel_id] = 0.0  # type: ignore[attr-defined]
    client.app.state.intake_scheduler._next_run_by_channel_id[fail_channel_id] = 0.0  # type: ignore[attr-defined]

    assert _wait_until(lambda: _db_count_raw_messages(good_pk) > 0, timeout_seconds=8.0)
    assert _wait_until(lambda: _db_get_channel_pk_and_cursor(fail_channel_id)[1] >= 1, timeout_seconds=8.0)
    assert _db_count_raw_messages(fail_pk) == 0


def test_manual_sync_edit_versions_and_console_distinction(client: TestClient) -> None:
    state = {"calls": 0}

    async def fake_fetch_channel_page(*, channel_username: str) -> FetchedTelegramPage:
        assert channel_username == "edit_case_channel"
        state["calls"] += 1
        if state["calls"] == 1:
            content = "open long btc at 100"
        elif state["calls"] == 2:
            content = "open long btc at 101"  # edited
        else:
            content = "open long btc at 101"  # unchanged

        html = f"""
        <div class="tgme_widget_message js-widget_message" data-post="{channel_username}/4001" data-view="v4001">
          <div class="tgme_widget_message_text js-message_text">{content}</div>
          <time datetime="2026-04-06T10:00:00+00:00"></time>
        </div>
        """
        return FetchedTelegramPage(
            fetch_url=f"https://t.me/s/{channel_username}",
            resolved_url=f"https://t.me/s/{channel_username}",
            html_text=html,
            raw_payload_ref=f"/s/{channel_username}",
        )

    client.app.state.intake_service._fetcher.fetch_channel_page = fake_fetch_channel_page  # type: ignore[assignment]

    login = client.post("/api/v1/auth/login", json={"password": "123456"})
    assert login.status_code == 200

    created = client.post(
        "/api/v1/intake/channels",
        json={
            "channel_name": "Edit Case",
            "source_type": "telegram_web",
            "source_ref": "@edit_case_channel",
            "status": "disabled",
        },
    )
    assert created.status_code == 201
    channel_id = created.json()["data"]["channel_id"]
    channel_pk, _ = _db_get_channel_pk_and_cursor(channel_id)
    assert channel_pk is not None
    channel_pk = int(channel_pk)

    first_sync = client.post(f"/api/v1/intake/channels/{channel_id}/sync")
    assert first_sync.status_code == 200
    assert first_sync.json()["data"]["new_count"] == 1
    assert first_sync.json()["data"]["edited_count"] == 0
    assert first_sync.json()["data"]["unchanged_count"] == 0

    channels_after_first = client.get("/api/v1/channels")
    assert channels_after_first.status_code == 200
    item_after_first = next(item for item in channels_after_first.json()["data"]["items"] if item["channel_id"] == channel_id)
    assert "new=1" in item_after_first["last_message_result"]
    assert "edited=0" in item_after_first["last_message_result"]

    second_sync = client.post(f"/api/v1/intake/channels/{channel_id}/sync")
    assert second_sync.status_code == 200
    assert second_sync.json()["data"]["new_count"] == 0
    assert second_sync.json()["data"]["edited_count"] == 1
    assert second_sync.json()["data"]["unchanged_count"] == 0

    channels_after_second = client.get("/api/v1/channels")
    assert channels_after_second.status_code == 200
    item_after_second = next(item for item in channels_after_second.json()["data"]["items"] if item["channel_id"] == channel_id)
    assert "edited=1" in item_after_second["last_message_result"]

    third_sync = client.post(f"/api/v1/intake/channels/{channel_id}/sync")
    assert third_sync.status_code == 200
    assert third_sync.json()["data"]["new_count"] == 0
    assert third_sync.json()["data"]["edited_count"] == 0
    assert third_sync.json()["data"]["unchanged_count"] == 1

    raw_count, normalized_count, version_count = _db_counts_for_message_tables(channel_pk)
    assert raw_count == 3
    assert normalized_count == 1
    assert version_count == 2
