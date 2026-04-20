"""Tests for admin user management routes."""
from datetime import datetime, timezone
from unittest.mock import MagicMock
from uuid import uuid4

from app.schemas.admin_user import AdminUserListItem, RoleBrief


def test_admin_users_unauthorized(client):
    response = client.get("/api/v1/admin/users")
    assert response.status_code == 401


def test_admin_users_forbidden_without_permission(monkeypatch, client_authenticated):
    monkeypatch.setattr(
        "app.api.v1.deps.get_permission_codes_for_user",
        lambda _db, _uid: [],
    )
    response = client_authenticated.get("/api/v1/admin/users")
    assert response.status_code == 403


def test_admin_users_list_ok(monkeypatch, client_authenticated):
    monkeypatch.setattr(
        "app.api.v1.deps.get_permission_codes_for_user",
        lambda _db, _uid: ["users:manage"],
    )
    rid = uuid4()
    uid = uuid4()

    class MockAdminUserService:
        def __init__(self, _db):
            pass

        def list_users(self, page, page_size, q):
            return [
                AdminUserListItem(
                    id=uid,
                    username="u1",
                    email="u1@example.com",
                    full_name=None,
                    is_active=True,
                    must_change_password=False,
                    created_at=datetime.now(timezone.utc),
                    roles=[RoleBrief(id=rid, name="admin")],
                )
            ], 1

    monkeypatch.setattr(
        "app.api.v1.endpoints.admin_users.AdminUserService",
        MockAdminUserService,
    )

    response = client_authenticated.get("/api/v1/admin/users")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert len(body["items"]) == 1
    assert body["items"][0]["username"] == "u1"
    assert body["items"][0]["roles"][0]["name"] == "admin"


def test_admin_create_user_ok(monkeypatch, client_authenticated):
    monkeypatch.setattr(
        "app.api.v1.deps.get_permission_codes_for_user",
        lambda _db, _uid: ["users:manage"],
    )
    uid = uuid4()

    class MockAdminUserService:
        def __init__(self, _db):
            pass

        def create_user(self, body):
            m = MagicMock()
            m.id = uid
            return m

        def get_user(self, user_id):
            if user_id != uid:
                return None
            m = MagicMock()
            m.id = uid
            m.username = "newuser"
            m.email = "new@example.com"
            m.full_name = None
            m.is_active = True
            m.must_change_password = False
            m.created_at = datetime.now(timezone.utc)
            m.user_roles = []
            return m

        def to_list_item(self, u):
            return AdminUserListItem(
                id=uid,
                username="newuser",
                email="new@example.com",
                full_name=None,
                is_active=True,
                must_change_password=False,
                created_at=datetime.now(timezone.utc),
                roles=[],
            )

    monkeypatch.setattr(
        "app.api.v1.endpoints.admin_users.AdminUserService",
        MockAdminUserService,
    )

    response = client_authenticated.post(
        "/api/v1/admin/users",
        json={
            "username": "newuser",
            "email": "new@example.com",
            "password": "securepass123",
            "is_active": True,
            "role_ids": [],
        },
    )
    assert response.status_code == 201
    assert response.json()["username"] == "newuser"


def test_admin_delete_user_ok(monkeypatch, client_authenticated):
    monkeypatch.setattr(
        "app.api.v1.deps.get_permission_codes_for_user",
        lambda _db, _uid: ["users:manage"],
    )
    uid = uuid4()

    class MockAdminUserService:
        def __init__(self, _db):
            pass

        def get_user(self, user_id):
            if user_id != uid:
                return None
            m = MagicMock()
            m.id = uid
            return m

        def delete_user(self, target, actor_id):
            pass

    monkeypatch.setattr(
        "app.api.v1.endpoints.admin_users.AdminUserService",
        MockAdminUserService,
    )

    response = client_authenticated.delete(f"/api/v1/admin/users/{uid}")
    assert response.status_code == 204
