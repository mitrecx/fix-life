"""Schemas for IP ban administration."""
from pydantic import BaseModel, Field


class BannedIpItem(BaseModel):
    ip: str
    scope: str
    ttl_seconds: int = Field(ge=0, description="Remaining ban duration in seconds")
    request_count: int = Field(ge=0, description="Login attempts in the current window")


class BannedIpListResponse(BaseModel):
    items: list[BannedIpItem]
