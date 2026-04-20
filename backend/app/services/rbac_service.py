from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.permission import Permission
from app.models.role_permission import RolePermission
from app.models.user_role import UserRole

SYSTEM_STATUS_READ = "system_status:read"


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
