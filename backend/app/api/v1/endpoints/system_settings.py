"""System settings endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.deps import get_db, get_current_user
from app.schemas.systemSettings import SystemSettingsResponse, SystemSettingsUpdate
from app.models.user import User
from app.models.systemSettings import SystemSettings

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
