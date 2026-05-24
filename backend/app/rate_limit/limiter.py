"""IP rate limit decision engine (no HTTP or auth business logic)."""
from __future__ import annotations

from dataclasses import dataclass

from app.rate_limit.store import IpRateLimitStore


@dataclass(frozen=True)
class RateLimitDecision:
    allowed: bool
    retry_after_seconds: int | None = None


class IpRateLimiter:
    def __init__(
        self,
        store: IpRateLimitStore,
        *,
        max_requests: int,
        window_seconds: int,
        ban_seconds: int,
    ) -> None:
        self.store = store
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.ban_seconds = ban_seconds

    async def check(self, scope: str, ip: str) -> RateLimitDecision:
        if await self.store.is_banned(scope, ip):
            return RateLimitDecision(
                allowed=False,
                retry_after_seconds=await self.store.ban_ttl_seconds(scope, ip),
            )

        count = await self.store.increment(scope, ip, self.window_seconds)
        if count > self.max_requests:
            await self.store.set_ban(scope, ip, self.ban_seconds)
            return RateLimitDecision(
                allowed=False,
                retry_after_seconds=self.ban_seconds,
            )

        return RateLimitDecision(allowed=True)

    async def close(self) -> None:
        await self.store.close()
