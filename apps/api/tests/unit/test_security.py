import pytest

from app.core.errors import AppError
from app.core.security import ensure_password_format


@pytest.mark.parametrize("value", ["123456", "000001"])
def test_password_format_accepts_six_digits(value: str) -> None:
    ensure_password_format(value)


@pytest.mark.parametrize("value", ["12345", "abcdef", "1234567", "12a456"])
def test_password_format_rejects_invalid_inputs(value: str) -> None:
    with pytest.raises(AppError):
        ensure_password_format(value)
