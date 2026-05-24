"""Signed tokens for accessing private OSS objects via the API."""
from __future__ import annotations

import base64
import hashlib
import hmac
import time

from app.core.config import settings

_TOKEN_VERSION = "v1"
_DEFAULT_TTL_SECONDS = 10 * 365 * 24 * 3600  # 10 years


def _sign(payload: str) -> str:
    digest = hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")


def create_media_token(object_key: str, ttl_seconds: int = _DEFAULT_TTL_SECONDS) -> str:
    expires_at = int(time.time()) + ttl_seconds
    payload = f"{_TOKEN_VERSION}:{object_key}:{expires_at}"
    signature = _sign(payload)
    raw = f"{payload}:{signature}"
    return base64.urlsafe_b64encode(raw.encode("utf-8")).decode("ascii").rstrip("=")


def verify_media_token(token: str) -> str:
    try:
        padded = token + "=" * (-len(token) % 4)
        raw = base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8")
        version, object_key, expires_at_str, signature = raw.rsplit(":", 3)
    except (ValueError, UnicodeDecodeError) as exc:
        raise ValueError("invalid token") from exc

    if version != _TOKEN_VERSION:
        raise ValueError("invalid token version")

    payload = f"{version}:{object_key}:{expires_at_str}"
    if not hmac.compare_digest(_sign(payload), signature):
        raise ValueError("invalid token signature")

    if int(expires_at_str) < int(time.time()):
        raise ValueError("token expired")

    return object_key
