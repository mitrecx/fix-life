# Re-export dependencies for convenience
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.services.rbac_service import (
    SYSTEM_STATUS_READ,
    USERS_MANAGE,
    get_permission_codes_for_user,
)

def require_permission(permission_code: str):
    async def permission_checker(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        codes = get_permission_codes_for_user(db, current_user.id)
        if permission_code not in codes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

    return permission_checker


# Resolved once so tests can `app.dependency_overrides[require_system_status_permission] = ...`
require_system_status_permission = require_permission(SYSTEM_STATUS_READ)
require_users_manage = require_permission(USERS_MANAGE)

__all__ = [
    "SYSTEM_STATUS_READ",
    "USERS_MANAGE",
    "get_db",
    "get_current_user",
    "get_permission_codes_for_user",
    "require_permission",
    "require_system_status_permission",
    "require_users_manage",
]
