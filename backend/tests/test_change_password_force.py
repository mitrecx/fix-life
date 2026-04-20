"""Tests for forced password change on POST /users/me/change-password."""
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.deps import get_current_user, get_db
from app.core.security import get_password_hash, verify_password
from app.main import app


@pytest.fixture
def client_change_password_force():
    user = MagicMock()
    user.id = uuid4()
    user.must_change_password = True
    user.hashed_password = get_password_hash("temp-from-admin")

    async def fake_user():
        return user

    db = MagicMock()

    def fake_db():
        yield db

    app.dependency_overrides[get_current_user] = fake_user
    app.dependency_overrides[get_db] = fake_db
    try:
        yield TestClient(app), user, db
    finally:
        app.dependency_overrides.clear()


@pytest.fixture
def client_change_password_normal():
    user = MagicMock()
    user.id = uuid4()
    user.must_change_password = False
    user.hashed_password = get_password_hash("correct-old")

    async def fake_user():
        return user

    db = MagicMock()

    def fake_db():
        yield db

    app.dependency_overrides[get_current_user] = fake_user
    app.dependency_overrides[get_db] = fake_db
    try:
        yield TestClient(app), user
    finally:
        app.dependency_overrides.clear()


def test_change_password_when_must_change_allows_no_old_password(client_change_password_force):
    client, user, db = client_change_password_force
    response = client.post(
        "/api/v1/users/me/change-password",
        json={"new_password": "newsecurepass123"},
    )
    assert response.status_code == 200
    assert user.must_change_password is False
    assert verify_password("newsecurepass123", user.hashed_password)
    db.commit.assert_called()


def test_change_password_when_not_forced_requires_old_password(client_change_password_normal):
    client, user = client_change_password_normal
    response = client.post(
        "/api/v1/users/me/change-password",
        json={"new_password": "newsecurepass123"},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "原密码错误"


def test_change_password_when_not_forced_wrong_old(client_change_password_normal):
    client, user = client_change_password_normal
    response = client.post(
        "/api/v1/users/me/change-password",
        json={"old_password": "wrong", "new_password": "newsecurepass123"},
    )
    assert response.status_code == 400
