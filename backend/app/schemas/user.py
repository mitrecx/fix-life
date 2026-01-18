"""User schemas for authentication and user management."""
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional
from uuid import UUID


class UserBase(BaseModel):
    """Base user fields."""
    username: str = Field(..., min_length=3, max_length=50, pattern="^[a-zA-Z0-9_-]+$", description="Username")
    email: EmailStr = Field(..., description="Email address")
    full_name: Optional[str] = Field(None, max_length=100, description="Full name")


class UserRegister(UserBase):
    """Schema for user registration request."""
    password: str = Field(..., min_length=8, max_length=100, description="Password (min 8 characters)")

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "username": "johndoe",
                "password": "securepassword123",
                "full_name": "John Doe"
            }
        }


class UserLogin(BaseModel):
    """Schema for user login request."""
    login_identifier: str = Field(..., min_length=1, max_length=100, description="Email or username")
    password: str = Field(..., min_length=1, max_length=100, description="Password")

    class Config:
        json_schema_extra = {
            "example": {
                "login_identifier": "user@example.com",
                "password": "securepassword123"
            }
        }


class UserResponse(UserBase):
    """Schema for user response."""
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Schema for token response."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "user": {
                    "id": "123e4567-e89b-12d3-a456-426614174000",
                    "username": "johndoe",
                    "email": "user@example.com",
                    "full_name": "John Doe",
                    "is_active": True,
                    "created_at": "2024-01-18T00:00:00Z",
                    "updated_at": "2024-01-18T00:00:00Z"
                }
            }
        }
