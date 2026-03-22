from __future__ import annotations

import hashlib
import re
from datetime import datetime, timezone

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError

from app.core.errors import AppError, ErrorCodes

PASSWORD_PATTERN = re.compile(r"^\d{6}$")
_password_hasher = PasswordHasher()


def ensure_password_format(password: str) -> None:
    if not PASSWORD_PATTERN.fullmatch(password):
        raise AppError(
            code=ErrorCodes.AUTH_INVALID_PASSWORD,
            message="密码格式错误，必须为 6 位数字。",
            status_code=400,
        )


def verify_owner_password(password: str, password_hash: str) -> bool:
    try:
        return _password_hasher.verify(password_hash, password)
    except (VerifyMismatchError, VerificationError):
        return False


def hash_text(value: str | None) -> str:
    raw = (value or "").encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def utc_now() -> datetime:
    return datetime.now(timezone.utc)
