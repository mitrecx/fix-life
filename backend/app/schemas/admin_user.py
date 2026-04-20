"""Schemas for admin user management APIs."""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class RoleBrief(BaseModel):
    id: UUID
    name: str


class AdminUserListItem(BaseModel):
    id: UUID
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    is_active: bool
    must_change_password: bool
    created_at: datetime
    roles: list[RoleBrief] = Field(default_factory=list)


class AdminUserListResponse(BaseModel):
    items: list[AdminUserListItem]
    total: int


class AdminUserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern="^[a-zA-Z0-9_-]+$")
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    full_name: Optional[str] = Field(None, max_length=100)
    is_active: bool = True
    role_ids: list[UUID] = Field(default_factory=list)


class AdminUserUpdate(BaseModel):
    is_active: Optional[bool] = None
    role_ids: Optional[list[UUID]] = None


class TempPasswordResponse(BaseModel):
    temp_password: str


class RoleListItem(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
