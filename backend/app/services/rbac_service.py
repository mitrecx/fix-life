from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.permission import Permission
from app.models.role import Role
from app.models.role_permission import RolePermission
from app.models.user_role import UserRole

SYSTEM_STATUS_READ = "system_status:read"
USERS_MANAGE = "users:manage"
QUICK_NOTES_USE = "quick_notes:use"
COMMUNITY_ROLE_NAME = "community"
PREMIUM_ROLE_NAME = "premium"


def get_permission_codes_for_user(db: Session, user_id: UUID) -> list[str]:
    stmt = (
        select(Permission.code)
        .join(RolePermission, Permission.id == RolePermission.permission_id)
        .join(UserRole, RolePermission.role_id == UserRole.role_id)
        .where(UserRole.user_id == user_id)
        .distinct()
    )
    rows = db.execute(stmt).scalars().all()
    return sorted(set(rows))


def assign_community_role(db: Session, user_id: UUID) -> None:
    role = db.query(Role).filter(Role.name == COMMUNITY_ROLE_NAME).first()
    if role is None:
        raise RuntimeError("community role not configured")
    exists = (
        db.query(UserRole)
        .filter(UserRole.user_id == user_id, UserRole.role_id == role.id)
        .first()
    )
    if exists:
        return
    db.add(UserRole(user_id=user_id, role_id=role.id))
