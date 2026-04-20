"""Build UserResponse with permission codes from RBAC."""
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import UserResponse
from app.services.rbac_service import get_permission_codes_for_user


def build_user_response(db: Session, user: User) -> UserResponse:
    perms = get_permission_codes_for_user(db, user.id)
    base = UserResponse.model_validate(user)
    return base.model_copy(update={"permissions": perms})
