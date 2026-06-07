"""WeChat mini program API helpers."""

from __future__ import annotations

import secrets
import string

import requests

from app.core.config import settings


class WeChatConfigError(Exception):
    """Raised when WeChat mini program credentials are missing."""


class WeChatAuthError(Exception):
    """Raised when WeChat login exchange fails."""


def _require_credentials() -> tuple[str, str]:
    app_id = settings.WECHAT_MINI_APP_ID.strip()
    app_secret = settings.WECHAT_MINI_APP_SECRET.strip()
    if not app_id or not app_secret:
        raise WeChatConfigError("微信小程序 AppID/AppSecret 未配置")
    return app_id, app_secret


def exchange_login_code(code: str) -> dict[str, str | None]:
    """Exchange wx.login code for openid and optional unionid."""
    app_id, app_secret = _require_credentials()
    response = requests.get(
        "https://api.weixin.qq.com/sns/jscode2session",
        params={
            "appid": app_id,
            "secret": app_secret,
            "js_code": code,
            "grant_type": "authorization_code",
        },
        timeout=10,
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get("errcode"):
        raise WeChatAuthError(payload.get("errmsg") or "微信登录失败")
    openid = payload.get("openid")
    if not openid:
        raise WeChatAuthError("微信登录未返回 openid")
    return {
        "openid": openid,
        "unionid": payload.get("unionid"),
    }


def build_wechat_placeholder_email(openid: str) -> str:
    """Use a resolvable-style domain so EmailStr validation passes in API responses."""
    import hashlib

    digest = hashlib.sha256(openid.encode("utf-8")).hexdigest()[:24]
    return f"wx{digest}@weixin.fixlife.mitrecx.top"


def build_wechat_username(openid: str) -> str:
    suffix = "".join(ch for ch in openid if ch.isalnum())[-12:] or secrets.token_hex(6)
    return f"wx{suffix}"[:50]


def random_password_hash_seed() -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(32))
