from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from logging import Logger
from typing import Any


class JsonLineFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname.lower(),
            "logger": record.name,
            "message": record.getMessage(),
        }
        if hasattr(record, "request_id"):
            payload["request_id"] = getattr(record, "request_id")
        if hasattr(record, "correlation_id"):
            payload["correlation_id"] = getattr(record, "correlation_id")
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def configure_logging() -> None:
    root = logging.getLogger()
    if root.handlers:
        return
    handler = logging.StreamHandler()
    handler.setFormatter(JsonLineFormatter())
    root.addHandler(handler)
    root.setLevel(logging.INFO)


def get_logger(name: str) -> Logger:
    return logging.getLogger(name)
