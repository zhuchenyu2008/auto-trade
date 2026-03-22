from __future__ import annotations

import asyncio
import json
from collections.abc import Iterable
from typing import Any


class SSEHub:
    def __init__(self, queue_size: int = 200) -> None:
        self._subscribers: set[asyncio.Queue[str]] = set()
        self._queue_size = queue_size
        self._lock = asyncio.Lock()

    async def subscribe(self) -> asyncio.Queue[str]:
        queue: asyncio.Queue[str] = asyncio.Queue(maxsize=self._queue_size)
        async with self._lock:
            self._subscribers.add(queue)
        return queue

    async def unsubscribe(self, queue: asyncio.Queue[str]) -> None:
        async with self._lock:
            self._subscribers.discard(queue)

    async def publish(self, event: dict[str, Any]) -> None:
        encoded = json.dumps(event, ensure_ascii=False)
        async with self._lock:
            targets: Iterable[asyncio.Queue[str]] = tuple(self._subscribers)

        for queue in targets:
            if queue.full():
                try:
                    queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass
            try:
                queue.put_nowait(encoded)
            except asyncio.QueueFull:
                # Keep stream non-blocking when client is too slow.
                continue

    async def close(self) -> None:
        async with self._lock:
            self._subscribers.clear()
