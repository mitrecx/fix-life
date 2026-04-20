"""Aggregate health checks for Postgres and Redis (Celery broker/result)."""
from datetime import datetime, timezone
import time

import redis
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.schemas.system_status import StatusCheckItem, SystemStatusResponse


class SystemStatusService:
    def __init__(self, db: Session):
        self.db = db

    def run(self) -> SystemStatusResponse:
        checked_at = datetime.now(timezone.utc)
        checks: list[StatusCheckItem] = []

        t0 = time.perf_counter()
        try:
            self.db.execute(text("SELECT 1"))
            latency_ms = (time.perf_counter() - t0) * 1000
            checks.append(
                StatusCheckItem(name="postgres", ok=True, latency_ms=round(latency_ms, 3))
            )
        except Exception as e:
            latency_ms = (time.perf_counter() - t0) * 1000
            checks.append(
                StatusCheckItem(
                    name="postgres",
                    ok=False,
                    latency_ms=round(latency_ms, 3),
                    error=str(e)[:200],
                )
            )

        checks.append(self._redis_check("redis_broker", settings.CELERY_BROKER_URL))
        if settings.CELERY_RESULT_BACKEND != settings.CELERY_BROKER_URL:
            checks.append(
                self._redis_check("redis_result_backend", settings.CELERY_RESULT_BACKEND)
            )

        all_ok = all(c.ok for c in checks)
        return SystemStatusResponse(checked_at=checked_at, all_ok=all_ok, checks=checks)

    def _redis_check(self, name: str, url: str) -> StatusCheckItem:
        t0 = time.perf_counter()
        try:
            client = redis.from_url(url, socket_connect_timeout=2)
            try:
                client.ping()
            finally:
                client.close()
            latency_ms = (time.perf_counter() - t0) * 1000
            return StatusCheckItem(name=name, ok=True, latency_ms=round(latency_ms, 3))
        except Exception as e:
            latency_ms = (time.perf_counter() - t0) * 1000
            return StatusCheckItem(
                name=name,
                ok=False,
                latency_ms=round(latency_ms, 3),
                error=str(e)[:200],
            )
