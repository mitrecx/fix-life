"""Tests for media access tokens."""
import time

import pytest

from app.services.media_token import create_media_token, verify_media_token


def test_media_token_roundtrip():
    object_key = "fix-life/quick-notes/user/test.png"
    token = create_media_token(object_key, ttl_seconds=3600)
    assert verify_media_token(token) == object_key


def test_media_token_rejects_tampered_token():
    token = create_media_token("fix-life/quick-notes/user/test.png", ttl_seconds=3600)
    with pytest.raises(ValueError):
        verify_media_token(token + "x")


def test_media_token_rejects_expired_token():
    token = create_media_token("fix-life/quick-notes/user/test.png", ttl_seconds=-1)
    time.sleep(0.01)
    with pytest.raises(ValueError):
        verify_media_token(token)
