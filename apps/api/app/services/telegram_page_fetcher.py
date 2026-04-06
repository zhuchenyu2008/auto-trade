from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urlparse

import httpx

from app.core.errors import AppError, ErrorCodes


@dataclass(slots=True)
class FetchedTelegramPage:
    fetch_url: str
    resolved_url: str
    html_text: str
    raw_payload_ref: str


class TelegramPageFetcher:
    def __init__(self, *, connect_timeout_seconds: float = 3.0, read_timeout_seconds: float = 10.0) -> None:
        timeout = httpx.Timeout(connect=connect_timeout_seconds, read=read_timeout_seconds, write=10.0, pool=10.0)
        self._timeout = timeout

    async def fetch_channel_page(self, *, channel_username: str) -> FetchedTelegramPage:
        fetch_url = f"https://t.me/s/{channel_username}"
        headers = {
            "user-agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            )
        }
        try:
            async with httpx.AsyncClient(timeout=self._timeout, follow_redirects=True) as client:
                response = await client.get(fetch_url, headers=headers)
        except httpx.HTTPError as exc:
            raise AppError(
                code=ErrorCodes.DEPENDENCY_UNAVAILABLE,
                message="Telegram 页面抓取失败，请稍后重试。",
                status_code=503,
                details={"reason": str(exc)},
            ) from exc

        if response.status_code >= 400:
            raise AppError(
                code=ErrorCodes.DEPENDENCY_UNAVAILABLE,
                message="Telegram 页面抓取失败，请检查频道地址或网络状态。",
                status_code=503,
                details={"status_code": response.status_code, "url": fetch_url},
            )

        resolved_url = str(response.url)
        path = urlparse(resolved_url).path
        raw_payload_ref = f"{path}{urlparse(resolved_url).query and ('?' + urlparse(resolved_url).query) or ''}"
        return FetchedTelegramPage(
            fetch_url=fetch_url,
            resolved_url=resolved_url,
            html_text=response.text,
            raw_payload_ref=raw_payload_ref,
        )
