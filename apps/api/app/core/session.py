from __future__ import annotations

import hashlib
import secrets


def create_session_id() -> str:
    return f"sess_{secrets.token_hex(16)}"


def create_session_token() -> str:
    return secrets.token_urlsafe(48)


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
