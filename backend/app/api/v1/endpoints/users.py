"""User profile endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional
import os
import uuid
from pathlib import Path

from app.api.v1.deps import get_db, get_current_user
from app.schemas.user import UserResponse, UserProfileUpdate, ChangePasswordRequest
from app.models.user import User
from app.core.security import verify_password, get_password_hash
from app.core.config import settings

router = APIRouter()

# Avatar URL base path (configure this in production)
AVATAR_URL_BASE = "/api/v1/users/avatar"


@router.get("/me", response_model=UserResponse)
def get_profile(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """
    Get current user profile information.

    Returns the authenticated user's profile data including:
    - id, username, email, full_name
    - avatar_url, bio
    - is_active, created_at, updated_at
    """
    return UserResponse.model_validate(current_user)


@router.put("/me", response_model=UserResponse)
def update_profile(
    profile_update: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserResponse:
    """
    Update current user profile.

    Allows updating:
    - full_name: User's display name
    - avatar_url: URL to user's avatar image
    - bio: User's biography/description

    Only provided fields will be updated (partial update).
    """
    # Update only provided fields
    if profile_update.full_name is not None:
        current_user.full_name = profile_update.full_name
    if profile_update.avatar_url is not None:
        current_user.avatar_url = profile_update.avatar_url
    if profile_update.bio is not None:
        current_user.bio = profile_update.bio

    db.commit()
    db.refresh(current_user)

    return UserResponse.model_validate(current_user)


@router.post("/me/change-password")
def change_password(
    password_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Change current user password.

    Requires both old password (for verification) and new password.
    The old password must match the current password.
    """
    # Verify old password
    if not verify_password(password_data.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="原密码错误"
        )

    # Update to new password
    current_user.hashed_password = get_password_hash(password_data.new_password)
    db.commit()

    return {"message": "密码修改成功"}


@router.post("/me/upload-avatar", response_model=dict)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload avatar image for current user.

    Accepts image files (jpg, jpeg, png, gif, webp).
    Stores image data in database.
    Maximum file size: 2MB
    """
    # Validate file type
    allowed_types = {"image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不支持的文件类型，请上传 JPG, PNG, GIF 或 WEBP 格式的图片"
        )

    # Validate file size (2MB)
    MAX_FILE_SIZE = 2 * 1024 * 1024
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="文件大小不能超过 2MB"
        )

    # Store avatar data in database
    current_user.avatar_data = content
    current_user.avatar_mime_type = file.content_type
    current_user.avatar_url = f"{AVATAR_URL_BASE}/{current_user.id}"
    db.commit()

    return {
        "message": "头像上传成功",
        "avatar_url": current_user.avatar_url
    }


@router.get("/avatar/{user_id}")
async def get_avatar(
    user_id: str,
    db: Session = Depends(get_db),
):
    """
    Serve avatar image from database.

    This endpoint returns the actual image data for the given user_id.
    Uses caching for better performance.
    """
    # Query user from database
    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )

    if user.avatar_data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="头像不存在"
        )

    # Determine media type (default to jpeg if not set)
    media_type = user.avatar_mime_type or "image/jpeg"

    return Response(
        content=user.avatar_data,
        media_type=media_type,
        headers={"Cache-Control": "public, max-age=31536000"}
    )
