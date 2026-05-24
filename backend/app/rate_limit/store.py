"""Storage backends for IP rate limiting."""
from __future__ import annotations

import time
from typing import Protocol


class IpRateLimitStore(Protocol):
    async def is_banned(self, scope: str, ip: str) -> bool: ...

    async def ban_ttl_seconds(self, scope: str, ip: str) -> int: ...

    async def set_ban(self, scope: str, ip: str, ban_seconds: int) -> None: ...

    async def increment(self, scope: str, ip: str, window_seconds: int) -> int: ...

    async def close(self) -> None: ...


class InMemoryIpRateLimitStore:
    """In-memory store for tests and local development without Redis."""

    def __init__(self) -> None:
        self._counts: dict[str, tuple[int, float]] = {}
        self._bans: dict[str, float] = {}

    def _count_key(self, scope: str, ip: str) -> str:
        return f"{scope}:{ip}:count"

    def _ban_key(self, scope: str, ip: str) -> str:
        return f"{scope}:{ip}:ban"

    def _purge_expired(self, key: str, now: float) -> None:
        expires_at = self._bans.get(key)
        if expires_at is not None and expires_at <= now:
            del self._bans[key]

    async def is_banned(self, scope: str, ip: str) -> bool:
        now = time.time()
        key = self._ban_key(scope, ip)
        self._purge_expired(key, now)
        expires_at = self._bans.get(key)
        return expires_at is not None and expires_at > now

    async def ban_ttl_seconds(self, scope: str, ip: str) -> int:
        now = time.time()
        key = self._ban_key(scope, ip)
        expires_at = self._bans.get(key)
        if expires_at is None or expires_at <= now:
            return 0
        return max(1, int(expires_at - now + 0.999))

    async def set_ban(self, scope: str, ip: str, ban_seconds: int) -> None:
        self._bans[self._ban_key(scope, ip)] = time.time() + ban_seconds

    async def increment(self, scope: str, ip: str, window_seconds: int) -> int:
        now = time.time()
        key = self._count_key(scope, ip)
        count, expires_at = self._counts.get(key, (0, 0.0))
        if expires_at <= now:
            count = 0
            expires_at = now + window_seconds
        count += 1
        self._counts[key] = (count, expires_at)
        return count

    async def close(self) -> None:
        self._counts.clear()
        self._bans.clear()


class RedisIpRateLimitStore:
    """Redis-backed sliding-window counter with temporary IP bans."""

    def __init__(self, redis_url: str, key_prefix: str = "fixlife:ip_rl") -> None:
        import redis.asyncio as redis

        self._redis = redis.from_url(redis_url, decode_responses=True)
        self._prefix = key_prefix

    def _count_key(self, scope: str, ip: str) -> str:
        return f"{self._prefix}:{scope}:{ip}:count"

    def _ban_key(self, scope: str, ip: str) -> str:
        return f"{self._prefix}:{scope}:{ip}:ban"

    async def is_banned(self, scope: str, ip: str) -> bool:
        return bool(await self._redis.exists(self._ban_key(scope, ip)))

    async def ban_ttl_seconds(self, scope: str, ip: str) -> int:
        ttl = await self._redis.ttl(self._ban_key(scope, ip))
        if ttl is None or ttl < 0:
            return 0
        return max(1, int(ttl))

    async def set_ban(self, scope: str, ip: str, ban_seconds: int) -> None:
        await self._redis.set(self._ban_key(scope, ip), "1", ex=ban_seconds)

    async def increment(self, scope: str, ip: str, window_seconds: int) -> int:
        key = self._count_key(scope, ip)
        count = await self._redis.incr(key)
        if count == 1:
            await self._redis.expire(key, window_seconds)
        return int(count)

    async def close(self) -> None:
        await self._redis.aclose()
