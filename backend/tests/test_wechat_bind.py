"""Tests for WeChat account binding endpoints."""

from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.deps import get_current_user, get_db
from app.main import app
from app.models.user import User
from app.services.wechat_bind_service import BIND_CODE_TTL_MINUTES


@pytest.fixture
def bind_client():
    user_id = uuid4()
    user = MagicMock(spec=User)
    user.id = user_id
    user.is_active = True
    user.wechat_openid = None
    user.email = "web@example.com"
    user.username = "webuser"

    db = MagicMock()

    async def fake_current_user():
        return user

    def fake_get_db():
        yield db

    app.dependency_overrides[get_current_user] = fake_current_user
    app.dependency_overrides[get_db] = fake_get_db
    try:
        yield TestClient(app), user, db
    finally:
        app.dependency_overrides.clear()


def test_create_wechat_bind_code(bind_client):
    client, user, db = bind_client
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=BIND_CODE_TTL_MINUTES)
    record = MagicMock()
    record.code = "123456"
    record.expires_at = expires_at

    with patch("app.api.v1.endpoints.auth.WeChatBindService") as service_cls:
        service_cls.return_value.create_bind_code.return_value = record
        response = client.post("/api/v1/auth/wechat-bind-code")

    assert response.status_code == 200
    payload = response.json()
    assert payload["code"] == "123456"
    assert payload["expires_in_seconds"] == BIND_CODE_TTL_MINUTES * 60
    service_cls.return_value.create_bind_code.assert_called_once_with(user)


def test_bind_wechat_account_returns_token(bind_client):
    client, _user, db = bind_client
    bound_user = MagicMock(spec=User)
    bound_user.id = uuid4()
    bound_user.is_active = True

    with patch("app.api.v1.endpoints.auth.exchange_login_code", return_value={"openid": "oid-1", "unionid": None}), patch(
        "app.api.v1.endpoints.auth.WeChatBindService"
    ) as service_cls, patch(
        "app.api.v1.endpoints.auth.build_user_response",
        return_value={
            "id": str(bound_user.id),
            "username": "bindweb",
            "email": "web@example.com",
            "is_active": True,
            "created_at": "2026-01-01T00:00:00Z",
            "permissions": [],
            "wechat_bound": True,
        },
    ), patch(
        "app.api.v1.endpoints.auth.create_access_token", return_value="token-abc"
    ):
        service_cls.return_value.bind_wechat_to_user.return_value = bound_user
        response = client.post(
            "/api/v1/auth/wechat-bind",
            json={"code": "123456", "wx_code": "wx-temp-code"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["access_token"] == "token-abc"
    service_cls.return_value.bind_wechat_to_user.assert_called_once()
