"""Tests for IP rate limiting infrastructure."""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.rate_limit.limiter import IpRateLimiter
from app.rate_limit.middleware import IpRateLimitMiddleware
from app.rate_limit.store import InMemoryIpRateLimitStore


@pytest.fixture
def memory_limiter() -> IpRateLimiter:
    return IpRateLimiter(
        InMemoryIpRateLimitStore(),
        max_requests=3,
        window_seconds=3600,
        ban_seconds=120,
    )


@pytest.mark.asyncio
async def test_allows_requests_under_limit(memory_limiter: IpRateLimiter):
    for _ in range(3):
        decision = await memory_limiter.check("auth_login", "203.0.113.10")
        assert decision.allowed is True


@pytest.mark.asyncio
async def test_bans_ip_after_limit_exceeded(memory_limiter: IpRateLimiter):
    for _ in range(3):
        await memory_limiter.check("auth_login", "203.0.113.11")

    blocked = await memory_limiter.check("auth_login", "203.0.113.11")
    assert blocked.allowed is False
    assert blocked.retry_after_seconds == 120

    still_blocked = await memory_limiter.check("auth_login", "203.0.113.11")
    assert still_blocked.allowed is False


@pytest.mark.asyncio
async def test_scopes_are_isolated(memory_limiter: IpRateLimiter):
    for _ in range(3):
        await memory_limiter.check("auth_login", "203.0.113.12")

    other_scope = await memory_limiter.check("other", "203.0.113.12")
    assert other_scope.allowed is True


def test_middleware_blocks_login_after_limit(memory_limiter: IpRateLimiter):
    app = FastAPI()
    app.add_middleware(IpRateLimitMiddleware, limiter=memory_limiter)

    @app.post("/api/v1/auth/login")
    def login():
        return {"ok": True}

    client = TestClient(app)
    headers = {"X-Real-IP": "203.0.113.20"}

    for _ in range(3):
        assert client.post("/api/v1/auth/login", headers=headers).status_code == 200

    blocked = client.post("/api/v1/auth/login", headers=headers)
    assert blocked.status_code == 429
    assert blocked.json()["detail"] == "请求过于频繁，请稍后再试"
    assert blocked.headers.get("Retry-After") == "120"


def test_middleware_ignores_unprotected_routes(memory_limiter: IpRateLimiter):
    app = FastAPI()
    app.add_middleware(IpRateLimitMiddleware, limiter=memory_limiter)

    @app.get("/health")
    def health():
        return {"status": "ok"}

    client = TestClient(app)
    headers = {"X-Real-IP": "203.0.113.21"}

    for _ in range(10):
        assert client.get("/health", headers=headers).status_code == 200
