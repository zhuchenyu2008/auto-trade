from __future__ import annotations

from app.services.intake_service import IntakeService
from app.services.telegram_intake_parser import parse_telegram_channel_html


def test_parse_telegram_channel_html_extracts_messages() -> None:
    html = """
    <section class="tgme_channel_history js-message_history">
      <div class="tgme_widget_message_wrap js-widget_message_wrap">
        <div class="tgme_widget_message js-widget_message" data-post="demo/11" data-view="token_11">
          <div class="tgme_widget_message_text js-message_text">Hello<br>World <img alt="🚀"></div>
          <time datetime="2026-04-06T10:00:00+00:00"></time>
        </div>
      </div>
      <div class="tgme_widget_message_wrap js-widget_message_wrap">
        <div class="tgme_widget_message js-widget_message" data-post="demo/12" data-view="token_12">
          <div class="tgme_widget_message_text js-message_text">Second message</div>
          <time datetime="2026-04-06T10:05:00+00:00"></time>
        </div>
      </div>
    </section>
    """
    messages = parse_telegram_channel_html(html)

    assert len(messages) == 2
    assert messages[0].source_message_id == "11"
    assert messages[0].raw_content == "Hello\nWorld 🚀"
    assert messages[0].source_edit_token == "token_11"
    assert messages[0].visible_at is not None
    assert messages[0].visible_at.isoformat() == "2026-04-06T10:00:00+00:00"

    assert messages[1].source_message_id == "12"
    assert messages[1].raw_content == "Second message"


def test_parse_telegram_channel_html_dedupes_same_message_id() -> None:
    html = """
    <div class="tgme_widget_message js-widget_message" data-post="demo/20">
      <div class="tgme_widget_message_text js-message_text">Old</div>
      <time datetime="2026-04-06T11:00:00+00:00"></time>
    </div>
    <div class="tgme_widget_message js-widget_message" data-post="demo/20">
      <div class="tgme_widget_message_text js-message_text">New</div>
      <time datetime="2026-04-06T11:01:00+00:00"></time>
    </div>
    """
    messages = parse_telegram_channel_html(html)

    assert len(messages) == 1
    assert messages[0].source_message_id == "20"
    assert messages[0].raw_content == "New"


def test_normalize_source_ref_accepts_url_and_username() -> None:
    username, canonical = IntakeService._normalize_source_ref("https://t.me/s/cryptoninjas_trading_ann")
    assert username == "cryptoninjas_trading_ann"
    assert canonical == "https://t.me/s/cryptoninjas_trading_ann"

    username2, canonical2 = IntakeService._normalize_source_ref("@cryptoninjas_trading_ann")
    assert username2 == "cryptoninjas_trading_ann"
    assert canonical2 == "https://t.me/s/cryptoninjas_trading_ann"


def test_normalize_source_type_accepts_legacy_alias() -> None:
    assert IntakeService._normalize_source_type("电报网页源") == "telegram_web"
    assert IntakeService._normalize_source_type("telegram-web") == "telegram_web"
