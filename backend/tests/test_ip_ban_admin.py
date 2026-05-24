"""Tests for IP ban admin API and service."""
import pytest

from app.rate_limit.ban_admin import IpBanAdminService
from app.rate_limit.store import InMemoryIpRateLimitStore


@pytest.fixture
def ban_service() -> IpBanAdminService:
    return IpBanAdminService(InMemoryIpRateLimitStore())


@pytest.mark.asyncio
async def test_list_and_unban_ip(ban_service: IpBanAdminService):
    store: InMemoryIpRateLimitStore = ban_service._store
    await store.set_ban("auth_login", "203.0.113.50", 3600)
    await store.increment("auth_login", "203.0.113.50", 3600)

    items = await ban_service.list_banned_ips()
    assert len(items) == 1
    assert items[0].ip == "203.0.113.50"
    assert items[0].scope == "auth_login"

    removed = await ban_service.unban_ip("auth_login", "203.0.113.50")
    assert removed is True
    assert await ban_service.list_banned_ips() == []


def test_list_ip_bans_api_forbidden(client_authenticated):
    response = client_authenticated.get("/api/v1/system/ip-bans")
    assert response.status_code == 403


def test_list_ip_bans_api_ok(monkeypatch, client_authenticated):
    monkeypatch.setattr(
        "app.api.v1.deps.get_permission_codes_for_user",
        lambda _db, _uid: ["system_status:read"],
    )

    class MockBanAdminService:
        async def list_banned_ips(self):
            from app.rate_limit.ban_admin import BannedIpRecord

            return [
                BannedIpRecord(
                    ip="203.0.113.50",
                    scope="auth_login",
                    ttl_seconds=120,
                    request_count=61,
                )
            ]

        async def close(self):
            pass

    monkeypatch.setattr(
        "app.api.v1.endpoints.system.IpBanAdminService.from_settings",
        lambda: MockBanAdminService(),
    )

    response = client_authenticated.get("/api/v1/system/ip-bans")
    assert response.status_code == 200
    body = response.json()
    assert len(body["items"]) == 1
    assert body["items"][0]["ip"] == "203.0.113.50"
