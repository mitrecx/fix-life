"""Aggregate health checks for Postgres, Redis, and Celery-related processes."""
from datetime import datetime, timezone
import subprocess
import time

import redis
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.celery import celery_app
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

        checks.append(self._celery_worker_check())
        checks.append(self._celery_beat_systemd_check())

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

    def _celery_worker_check(self) -> StatusCheckItem:
        """At least one Celery worker must reply to inspect ping (via broker)."""
        t0 = time.perf_counter()
        try:
            inspection = celery_app.control.inspect(timeout=2.0)
            latency_ms = round((time.perf_counter() - t0) * 1000, 3)
            if inspection is None:
                return StatusCheckItem(
                    name="celery_worker",
                    ok=False,
                    latency_ms=latency_ms,
                    error="无法从 broker 获取 Worker 列表（broker 不可达或无 Worker 在线）",
                )
            pong = inspection.ping()
            if not pong:
                return StatusCheckItem(
                    name="celery_worker",
                    ok=False,
                    latency_ms=latency_ms,
                    error="没有 Worker 响应 ping",
                )
            workers_ok = sum(
                1
                for reply in pong.values()
                if isinstance(reply, dict) and reply.get("ok") == "pong"
            )
            if workers_ok < 1:
                return StatusCheckItem(
                    name="celery_worker",
                    ok=False,
                    latency_ms=latency_ms,
                    error=f"ping 返回异常: {list(pong.values())[:3]!s}"[:200],
                )
            return StatusCheckItem(
                name="celery_worker",
                ok=True,
                latency_ms=latency_ms,
                error=None,
            )
        except Exception as e:
            latency_ms = round((time.perf_counter() - t0) * 1000, 3)
            return StatusCheckItem(
                name="celery_worker",
                ok=False,
                latency_ms=latency_ms,
                error=str(e)[:200],
            )

    def _celery_beat_systemd_check(self) -> StatusCheckItem:
        """Best-effort: systemd unit fix-life-celery-beat (production layout)."""
        t0 = time.perf_counter()
        try:
            proc = subprocess.run(
                ["systemctl", "is-active", "fix-life-celery-beat"],
                capture_output=True,
                text=True,
                timeout=3,
            )
            latency_ms = round((time.perf_counter() - t0) * 1000, 3)
            out = (proc.stdout or "").strip()
            if proc.returncode == 0 and out == "active":
                return StatusCheckItem(
                    name="celery_beat",
                    ok=True,
                    latency_ms=latency_ms,
                )
            err = out or (proc.stderr or "").strip() or f"exit {proc.returncode}"
            return StatusCheckItem(
                name="celery_beat",
                ok=False,
                latency_ms=latency_ms,
                error=err[:200],
            )
        except FileNotFoundError:
            return StatusCheckItem(
                name="celery_beat",
                ok=False,
                error="无 systemctl（本地开发可忽略此项）",
            )
        except subprocess.TimeoutExpired:
            return StatusCheckItem(
                name="celery_beat",
                ok=False,
                error="systemctl 超时",
            )
        except Exception as e:
            return StatusCheckItem(
                name="celery_beat",
                ok=False,
                error=str(e)[:200],
            )
