"""HTTP middleware that applies IP rate limits to configured routes."""
from __future__ import annotations

import logging
from dataclasses import dataclass

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.types import ASGIApp

from app.core.config import settings
from app.rate_limit.client_ip import get_client_ip
from app.rate_limit.limiter import IpRateLimiter
from app.rate_limit.store import InMemoryIpRateLimitStore, RedisIpRateLimitStore

logger = logging.getLogger(__name__)

RATE_LIMIT_MESSAGE = "请求过于频繁，请稍后再试"


@dataclass(frozen=True)
class ProtectedRoute:
    method: str
    path: str
    scope: str


DEFAULT_PROTECTED_ROUTES = (
    ProtectedRoute(method="POST", path="/api/v1/auth/login", scope="auth_login"),
)


def _matches_route(method: str, path: str, routes: tuple[ProtectedRoute, ...]) -> str | None:
    normalized_path = path.rstrip("/") or "/"
    for route in routes:
        route_path = route.path.rstrip("/") or "/"
        if method.upper() == route.method.upper() and normalized_path == route_path:
            return route.scope
    return None


def build_ip_rate_limiter(*, use_redis: bool | None = None) -> IpRateLimiter:
    use_redis_backend = settings.IP_RATE_LIMIT_USE_REDIS if use_redis is None else use_redis
    if use_redis_backend:
        store = RedisIpRateLimitStore(
            settings.IP_RATE_LIMIT_REDIS_URL,
            key_prefix=settings.IP_RATE_LIMIT_REDIS_KEY_PREFIX,
        )
    else:
        store = InMemoryIpRateLimitStore()
    return IpRateLimiter(
        store,
        max_requests=settings.IP_RATE_LIMIT_MAX_REQUESTS,
        window_seconds=settings.IP_RATE_LIMIT_WINDOW_SECONDS,
        ban_seconds=settings.IP_RATE_LIMIT_BAN_SECONDS,
    )


class IpRateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app: ASGIApp,
        *,
        limiter: IpRateLimiter,
        protected_routes: tuple[ProtectedRoute, ...] = DEFAULT_PROTECTED_ROUTES,
    ) -> None:
        super().__init__(app)
        self.limiter = limiter
        self.protected_routes = protected_routes

    async def dispatch(self, request: Request, call_next) -> Response:
        if not settings.IP_RATE_LIMIT_ENABLED:
            return await call_next(request)

        scope = _matches_route(request.method, request.url.path, self.protected_routes)
        if scope is None:
            return await call_next(request)

        client_ip = get_client_ip(
            x_forwarded_for=request.headers.get("x-forwarded-for"),
            x_real_ip=request.headers.get("x-real-ip"),
            direct_host=request.client.host if request.client else None,
        )
        if not client_ip:
            return await call_next(request)

        try:
            decision = await self.limiter.check(scope, client_ip)
        except Exception:
            logger.exception("IP rate limit check failed; allowing request")
            return await call_next(request)

        if decision.allowed:
            return await call_next(request)

        headers = {}
        if decision.retry_after_seconds:
            headers["Retry-After"] = str(decision.retry_after_seconds)
        return JSONResponse(
            status_code=429,
            content={"detail": RATE_LIMIT_MESSAGE},
            headers=headers,
        )


def build_ip_rate_limit_middleware(app: ASGIApp) -> IpRateLimitMiddleware:
    return IpRateLimitMiddleware(app, limiter=build_ip_rate_limiter())
