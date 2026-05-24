from datetime import datetime

from pydantic import BaseModel, Field


class McpApiKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class McpApiKeyListItem(BaseModel):
    id: str
    name: str
    key_prefix: str
    key_suffix: str
    created_at: datetime
    last_used_at: datetime | None = None


class McpApiKeyListResponse(BaseModel):
    items: list[McpApiKeyListItem]


class McpApiKeyCreateResponse(McpApiKeyListItem):
    api_key: str


class McpApiKeySecretResponse(BaseModel):
    api_key: str
