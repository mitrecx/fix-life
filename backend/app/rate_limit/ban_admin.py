"""Administration helpers for IP bans (separate from HTTP middleware)."""
from __future__ import annotations

from dataclasses import dataclass
import time

from app.core.config import settings
from app.rate_limit.middleware import DEFAULT_PROTECTED_ROUTES
from app.rate_limit.store import InMemoryIpRateLimitStore, RedisIpRateLimitStore


@dataclass(frozen=True)
class BannedIpRecord:
    ip: str
    scope: str
    ttl_seconds: int
    request_count: int


def _known_scopes() -> tuple[str, ...]:
    return tuple({route.scope for route in DEFAULT_PROTECTED_ROUTES})


def _parse_ban_key(key: str, prefix: str) -> tuple[str, str] | None:
    if not key.endswith(":ban"):
        return None
    head = f"{prefix}:"
    if not key.startswith(head):
        return None
    body = key[len(head) : -4]
    for scope in _known_scopes():
        scope_prefix = f"{scope}:"
        if body.startswith(scope_prefix):
            ip = body[len(scope_prefix) :]
            if ip:
                return scope, ip
    return None


def _parse_memory_ban_key(key: str) -> tuple[str, str] | None:
    if not key.endswith(":ban"):
        return None
    body = key[:-4]
    for scope in _known_scopes():
        scope_prefix = f"{scope}:"
        if body.startswith(scope_prefix):
            ip = body[len(scope_prefix) :]
            if ip:
                return scope, ip
    return None


class IpBanAdminService:
    def __init__(self, store) -> None:
        self._store = store
        self._prefix = settings.IP_RATE_LIMIT_REDIS_KEY_PREFIX

    @classmethod
    def from_settings(cls) -> "IpBanAdminService":
        if settings.IP_RATE_LIMIT_USE_REDIS:
            store = RedisIpRateLimitStore(
                settings.IP_RATE_LIMIT_REDIS_URL,
                key_prefix=settings.IP_RATE_LIMIT_REDIS_KEY_PREFIX,
            )
        else:
            store = InMemoryIpRateLimitStore()
        return cls(store)

    async def list_banned_ips(self) -> list[BannedIpRecord]:
        if isinstance(self._store, RedisIpRateLimitStore):
            return await self._list_from_redis()
        if isinstance(self._store, InMemoryIpRateLimitStore):
            return await self._list_from_memory()
        return []

    async def unban_ip(self, scope: str, ip: str) -> bool:
        if scope not in _known_scopes():
            return False
        if isinstance(self._store, RedisIpRateLimitStore):
            deleted = await self._store._redis.delete(
                self._store._ban_key(scope, ip),
                self._store._count_key(scope, ip),
            )
            return deleted > 0
        if isinstance(self._store, InMemoryIpRateLimitStore):
            ban_key = self._store._ban_key(scope, ip)
            count_key = self._store._count_key(scope, ip)
            existed = ban_key in self._store._bans
            self._store._bans.pop(ban_key, None)
            self._store._counts.pop(count_key, None)
            return existed
        return False

    async def _list_from_redis(self) -> list[BannedIpRecord]:
        store: RedisIpRateLimitStore = self._store
        pattern = f"{self._prefix}:*:ban"
        records: list[BannedIpRecord] = []
        async for key in store._redis.scan_iter(match=pattern, count=200):
            parsed = _parse_ban_key(key, self._prefix)
            if not parsed:
                continue
            scope, ip = parsed
            ttl = await store.ban_ttl_seconds(scope, ip)
            if ttl <= 0:
                continue
            count_raw = await store._redis.get(store._count_key(scope, ip))
            request_count = int(count_raw) if count_raw else 0
            records.append(
                BannedIpRecord(
                    ip=ip,
                    scope=scope,
                    ttl_seconds=ttl,
                    request_count=request_count,
                )
            )
        records.sort(key=lambda item: (-item.ttl_seconds, item.ip))
        return records

    async def _list_from_memory(self) -> list[BannedIpRecord]:
        store: InMemoryIpRateLimitStore = self._store
        now = time.time()
        records: list[BannedIpRecord] = []
        for key, expires_at in list(store._bans.items()):
            if expires_at <= now:
                continue
            parsed = _parse_memory_ban_key(key)
            if not parsed:
                continue
            scope, ip = parsed
            ttl = max(1, int(expires_at - now + 0.999))
            count_key = store._count_key(scope, ip)
            count, count_expires = store._counts.get(count_key, (0, 0.0))
            if count_expires <= now:
                count = 0
            records.append(
                BannedIpRecord(
                    ip=ip,
                    scope=scope,
                    ttl_seconds=ttl,
                    request_count=count,
                )
            )
        records.sort(key=lambda item: (-item.ttl_seconds, item.ip))
        return records

    async def close(self) -> None:
        await self._store.close()
