"""Tests for GET /api/v1/system/status."""
from datetime import datetime, timezone

import pytest

from app.schemas.system_status import StatusCheckItem, SystemStatusResponse


def test_system_status_unauthorized(client):
    response = client.get("/api/v1/system/status")
    assert response.status_code == 401


def test_system_status_forbidden_without_permission(monkeypatch, client_authenticated):
    monkeypatch.setattr(
        "app.api.v1.deps.get_permission_codes_for_user",
        lambda _db, _uid: [],
    )
    response = client_authenticated.get("/api/v1/system/status")
    assert response.status_code == 403


def test_system_status_ok_with_permission(monkeypatch, client_authenticated):
    monkeypatch.setattr(
        "app.api.v1.deps.get_permission_codes_for_user",
        lambda _db, _uid: ["system_status:read"],
    )

    class MockSystemStatusService:
        def __init__(self, _db):
            pass

        def run(self) -> SystemStatusResponse:
            return SystemStatusResponse(
                checked_at=datetime.now(timezone.utc),
                all_ok=True,
                checks=[StatusCheckItem(name="postgres", ok=True, latency_ms=0.5)],
            )

    monkeypatch.setattr(
        "app.api.v1.endpoints.system.SystemStatusService",
        MockSystemStatusService,
    )

    response = client_authenticated.get("/api/v1/system/status")
    assert response.status_code == 200
    body = response.json()
    assert body["all_ok"] is True
    assert len(body["checks"]) == 1
    assert body["checks"][0]["name"] == "postgres"
    assert body["checks"][0]["ok"] is True
