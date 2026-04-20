"""Schemas for system health / dependency checks."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class StatusCheckItem(BaseModel):
    name: str
    ok: bool
    latency_ms: Optional[float] = None
    error: Optional[str] = None


class SystemStatusResponse(BaseModel):
    checked_at: datetime
    all_ok: bool
    checks: list[StatusCheckItem] = Field(default_factory=list)
