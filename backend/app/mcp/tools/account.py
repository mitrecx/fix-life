from __future__ import annotations

from typing import Any

from app.core.security import get_password_hash, verify_password
from app.mcp.helpers import db_session, dump, get_user_id, tool_error
from app.models.systemSettings import SystemSettings
from app.models.user import User
from app.schemas.systemSettings import SystemSettingsUpdate
from app.schemas.user import ChangePasswordRequest, UserProfileUpdate
from app.services.user_response import build_user_response


def handle_account(payload: dict[str, Any]) -> dict[str, Any]:
    action = payload.get("action")
    if not action:
        tool_error(422, "VALIDATION_ERROR", "action is required")

    user_id = get_user_id()

    with db_session() as db:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            tool_error(404, "NOT_FOUND", "User not found")

        if action == "get_profile":
            return dump(build_user_response(db, user))

        if action == "update_profile":
            body = UserProfileUpdate.model_validate(payload.get("data") or payload)
            if body.full_name is not None:
                user.full_name = body.full_name
            if body.avatar_url is not None:
                user.avatar_url = body.avatar_url
            if body.bio is not None:
                user.bio = body.bio
            db.commit()
            db.refresh(user)
            return dump(build_user_response(db, user))

        if action == "change_password":
            body = ChangePasswordRequest.model_validate(payload.get("data") or payload)
            if not user.must_change_password:
                if not body.old_password or not verify_password(body.old_password, user.hashed_password):
                    tool_error(400, "VALIDATION_ERROR", "Incorrect current password")
            user.hashed_password = get_password_hash(body.new_password)
            user.must_change_password = False
            db.commit()
            return {"message": "Password updated successfully"}

        if action == "get_settings":
            settings = db.query(SystemSettings).filter(SystemSettings.user_id == user_id).first()
            if not settings:
                settings = SystemSettings(user_id=user_id, show_daily_summary=False)
                db.add(settings)
                db.commit()
                db.refresh(settings)
            return dump(settings)

        if action == "update_settings":
            settings = db.query(SystemSettings).filter(SystemSettings.user_id == user_id).first()
            if not settings:
                settings = SystemSettings(user_id=user_id)
                db.add(settings)
            body = SystemSettingsUpdate.model_validate(payload.get("data") or payload)
            for field, value in body.model_dump(exclude_unset=True).items():
                setattr(settings, field, value)
            db.commit()
            db.refresh(settings)
            return dump(settings)

    tool_error(422, "VALIDATION_ERROR", f"Unknown account action: {action}")
