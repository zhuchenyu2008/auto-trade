from app.core.session import create_session_token, hash_session_token


def test_hash_session_token_is_deterministic() -> None:
    token = create_session_token()
    assert hash_session_token(token) == hash_session_token(token)


def test_create_session_token_is_non_empty() -> None:
    token = create_session_token()
    assert isinstance(token, str)
    assert len(token) > 32
