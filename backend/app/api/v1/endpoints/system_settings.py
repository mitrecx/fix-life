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
    """
    settings = db.query(SystemSettings).filter(SystemSettings.user_id == current_user.id).first()

    if not settings:
        # Create settings if they don't exist
        settings = SystemSettings(user_id=current_user.id)
        db.add(settings)

    # Update fields if provided
    if settings_update.show_daily_summary is not None:
        settings.show_daily_summary = settings_update.show_daily_summary

    db.commit()
    db.refresh(settings)

    return SystemSettingsResponse(
        id=str(settings.id),
        user_id=str(settings.user_id),
        show_daily_summary=settings.show_daily_summary,
        created_at=settings.created_at,
        updated_at=settings.updated_at,
    )
