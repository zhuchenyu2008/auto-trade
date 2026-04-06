from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from html.parser import HTMLParser
from typing import Any


PARSER_VERSION = "telegram_web_parser_v1"
_VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}


@dataclass(slots=True)
class ParsedTelegramMessage:
    source_message_id: str
    raw_content: str
    visible_at: datetime | None
    source_edit_token: str | None


class _TelegramMessageHtmlParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.messages: list[ParsedTelegramMessage] = []

        self._current: dict[str, Any] | None = None
        self._message_depth: int = 0
        self._capture_text: bool = False
        self._text_depth: int = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = {k: v for k, v in attrs if v is not None}
        class_name = attr_map.get("class", "")

        if self._current is None:
            data_post = attr_map.get("data-post")
            if tag == "div" and data_post and "tgme_widget_message" in class_name:
                source_message_id = data_post.split("/", maxsplit=1)[-1].strip()
                if source_message_id:
                    self._current = {
                        "source_message_id": source_message_id,
                        "raw_parts": [],
                        "visible_at": None,
                        "source_edit_token": attr_map.get("data-view"),
                    }
                    self._message_depth = 1
                    self._capture_text = False
                    self._text_depth = 0
            return

        if tag not in _VOID_TAGS:
            self._message_depth += 1

        if tag == "time" and self._current.get("visible_at") is None:
            datetime_text = attr_map.get("datetime")
            if datetime_text:
                try:
                    self._current["visible_at"] = datetime.fromisoformat(datetime_text)
                except ValueError:
                    self._current["visible_at"] = None

        if tag == "div" and "tgme_widget_message_text" in class_name:
            self._capture_text = True
            self._text_depth = 1
            return

        if self._capture_text and tag not in _VOID_TAGS:
            self._text_depth += 1
            if tag == "br":
                self._current["raw_parts"].append("\n")
            if tag == "img":
                alt = attr_map.get("alt")
                if alt:
                    self._current["raw_parts"].append(alt)
        elif self._capture_text:
            if tag == "br":
                self._current["raw_parts"].append("\n")
            if tag == "img":
                alt = attr_map.get("alt")
                if alt:
                    self._current["raw_parts"].append(alt)

    def handle_endtag(self, tag: str) -> None:
        if self._current is None:
            return

        if self._capture_text:
            self._text_depth -= 1
            if self._text_depth <= 0:
                self._capture_text = False
                self._text_depth = 0

        self._message_depth -= 1
        if self._message_depth <= 0:
            source_message_id = str(self._current.get("source_message_id") or "").strip()
            raw_content = "".join(self._current.get("raw_parts", [])).strip()
            visible_at = self._current.get("visible_at")
            source_edit_token = self._current.get("source_edit_token")
            if source_message_id:
                self.messages.append(
                    ParsedTelegramMessage(
                        source_message_id=source_message_id,
                        raw_content=raw_content,
                        visible_at=visible_at if isinstance(visible_at, datetime) else None,
                        source_edit_token=source_edit_token if isinstance(source_edit_token, str) else None,
                    )
                )
            self._current = None
            self._message_depth = 0
            self._capture_text = False
            self._text_depth = 0

    def handle_data(self, data: str) -> None:
        if self._current is not None and self._capture_text:
            self._current["raw_parts"].append(data)


def parse_telegram_channel_html(html_text: str) -> list[ParsedTelegramMessage]:
    parser = _TelegramMessageHtmlParser()
    parser.feed(html_text)
    parser.close()

    deduped: dict[str, ParsedTelegramMessage] = {}
    for item in parser.messages:
        deduped[item.source_message_id] = item

    def _sort_key(message: ParsedTelegramMessage) -> tuple[int, str]:
        value = message.source_message_id
        if value.isdigit():
            return (0, f"{int(value):020d}")
        return (1, value)

    return sorted(deduped.values(), key=_sort_key)
