"""System settings endpoints."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.deps import get_db, get_current_user
from app.models.user import User
from app.models.systemSettings import SystemSettings
from app.schemas.mcp_api_key import (
    McpApiKeyCreate,
    McpApiKeyCreateResponse,
    McpApiKeyListItem,
    McpApiKeyListResponse,
)
from app.schemas.systemSettings import SystemSettingsResponse, SystemSettingsUpdate
from app.services.mcp_api_key_service import McpApiKeyService

router = APIRouter()


@router.get("/me", response_model=SystemSettingsResponse)
def get_system_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SystemSettingsResponse:
    """
    Get current user's system settings.

    Returns the authenticated user's system settings.
    If settings don't exist, creates default settings.
    """
    settings = db.query(SystemSettings).filter(SystemSettings.user_id == current_user.id).first()

    if not settings:
        # Create default settings for the user
        settings = SystemSettings(user_id=current_user.id, show_daily_summary=False)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return SystemSettingsResponse(
        id=str(settings.id),
        user_id=str(settings.user_id),
        show_daily_summary=settings.show_daily_summary,
        weekly_summary_email_enabled=settings.weekly_summary_email_enabled,
        weekly_summary_email=settings.weekly_summary_email,
        weekly_summary_feishu_enabled=settings.weekly_summary_feishu_enabled,
        feishu_app_id=settings.feishu_app_id,
        feishu_app_secret=settings.feishu_app_secret,
        feishu_chat_id=settings.feishu_chat_id,
        created_at=settings.created_at,
        updated_at=settings.updated_at,
    )


@router.put("/me", response_model=SystemSettingsResponse)
def update_system_settings(
    settings_update: SystemSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SystemSettingsResponse:
    """
    Update current user's system settings.

    Allows updating:
    - show_daily_summary: Whether to show daily summary in daily plan cards
    - weekly_summary_email_enabled: Enable weekly summary email notifications
    - weekly_summary_email: Custom email for weekly summary notifications (defaults to user email)
    - weekly_summary_feishu_enabled: Enable weekly summary Feishu notifications
    - feishu_app_id: Feishu app ID for API access
    - feishu_app_secret: Feishu app secret for API access
    - feishu_chat_id: Target Feishu group chat ID
    """
    settings = db.query(SystemSettings).filter(SystemSettings.user_id == current_user.id).first()

    if not settings:
        # Create settings if they don't exist
        settings = SystemSettings(user_id=current_user.id)
        db.add(settings)

    # Update fields if provided
    if settings_update.show_daily_summary is not None:
        settings.show_daily_summary = settings_update.show_daily_summary
    if settings_update.weekly_summary_email_enabled is not None:
        settings.weekly_summary_email_enabled = settings_update.weekly_summary_email_enabled
    if settings_update.weekly_summary_email is not None:
        settings.weekly_summary_email = settings_update.weekly_summary_email
    if settings_update.weekly_summary_feishu_enabled is not None:
        settings.weekly_summary_feishu_enabled = settings_update.weekly_summary_feishu_enabled
    if settings_update.feishu_app_id is not None:
        settings.feishu_app_id = settings_update.feishu_app_id
    if settings_update.feishu_app_secret is not None:
        settings.feishu_app_secret = settings_update.feishu_app_secret
    if settings_update.feishu_chat_id is not None:
        settings.feishu_chat_id = settings_update.feishu_chat_id

    db.commit()
    db.refresh(settings)

    return SystemSettingsResponse(
        id=str(settings.id),
        user_id=str(settings.user_id),
        show_daily_summary=settings.show_daily_summary,
        weekly_summary_email_enabled=settings.weekly_summary_email_enabled,
        weekly_summary_email=settings.weekly_summary_email,
        weekly_summary_feishu_enabled=settings.weekly_summary_feishu_enabled,
        feishu_app_id=settings.feishu_app_id,
        feishu_app_secret=settings.feishu_app_secret,
        feishu_chat_id=settings.feishu_chat_id,
        created_at=settings.created_at,
        updated_at=settings.updated_at,
    )


def _to_mcp_key_item(record, *, api_key: str | None = None):
    suffix = McpApiKeyService.mask_suffix(api_key) if api_key else record.key_prefix[-4:]
    item = McpApiKeyListItem(
        id=str(record.id),
        name=record.name,
        key_prefix=record.key_prefix,
        key_suffix=suffix,
        created_at=record.created_at,
        last_used_at=record.last_used_at,
    )
    if api_key:
        return McpApiKeyCreateResponse(**item.model_dump(), api_key=api_key)
    return item


@router.get("/mcp-keys", response_model=McpApiKeyListResponse)
def list_mcp_api_keys(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> McpApiKeyListResponse:
    service = McpApiKeyService(db)
    items = [_to_mcp_key_item(record) for record in service.list_active_keys(current_user.id)]
    return McpApiKeyListResponse(items=items)


@router.post("/mcp-keys", response_model=McpApiKeyCreateResponse, status_code=status.HTTP_201_CREATED)
def create_mcp_api_key(
    body: McpApiKeyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> McpApiKeyCreateResponse:
    service = McpApiKeyService(db)
    try:
        record, api_key = service.create_key(current_user.id, body.name)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return _to_mcp_key_item(record, api_key=api_key)


@router.delete("/mcp-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_mcp_api_key(
    key_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    service = McpApiKeyService(db)
    if not service.revoke_key(current_user.id, key_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MCP API key not found")
