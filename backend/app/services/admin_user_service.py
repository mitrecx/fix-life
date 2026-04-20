"""Admin user listing, role updates, and temporary password issuance."""
import secrets
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from app.core.security import get_password_hash
from app.models.role import Role
from app.models.user import User
from app.models.user_role import UserRole
from app.schemas.admin_user import AdminUserCreate, AdminUserListItem, RoleBrief


class AdminUserService:
    def __init__(self, db: Session):
        self.db = db

    def _admin_role(self) -> Role:
        role = self.db.query(Role).filter(Role.name == "admin").first()
        if not role:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="admin role not configured",
            )
        return role

    def _active_admin_count_after_update(
        self,
        target: User,
        new_is_active: bool | None,
        new_role_ids: list[UUID] | None,
    ) -> int:
        admin_rid = self._admin_role().id
        users = self.db.query(User).options(selectinload(User.user_roles)).all()
        count = 0
        for u in users:
            is_act = u.is_active
            role_ids = {ur.role_id for ur in u.user_roles}
            if u.id == target.id:
                if new_is_active is not None:
                    is_act = new_is_active
                if new_role_ids is not None:
                    role_ids = set(new_role_ids)
            if is_act and admin_rid in role_ids:
                count += 1
        return count

    def assert_can_apply_patch(
        self,
        target: User,
        actor_id: UUID,
        new_is_active: bool | None,
        new_role_ids: list[UUID] | None,
    ) -> None:
        if new_is_active is False and target.id == actor_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="不能停用自己的账号",
            )
        if new_is_active is None and new_role_ids is None:
            return
        if self._active_admin_count_after_update(target, new_is_active, new_role_ids) < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="须至少保留一名可用的管理员",
            )

    def list_users(self, page: int, page_size: int, q: str | None) -> tuple[list[AdminUserListItem], int]:
        query = self.db.query(User)
        if q and q.strip():
            term = f"%{q.strip()}%"
            query = query.filter(or_(User.username.ilike(term), User.email.ilike(term)))
        total = query.count()
        rows = (
            query.options(selectinload(User.user_roles).selectinload(UserRole.role))
            .order_by(User.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        items = []
        for u in rows:
            roles = []
            for ur in u.user_roles:
                if ur.role:
                    roles.append(RoleBrief(id=ur.role.id, name=ur.role.name))
            roles.sort(key=lambda r: r.name)
            items.append(
                AdminUserListItem(
                    id=u.id,
                    username=u.username,
                    email=u.email,
                    full_name=u.full_name,
                    is_active=u.is_active,
                    must_change_password=u.must_change_password,
                    created_at=u.created_at,
                    roles=roles,
                )
            )
        return items, total

    def create_user(self, data: AdminUserCreate) -> User:
        if self.db.query(User).filter(User.username == data.username).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="用户名已被使用",
            )
        if self.db.query(User).filter(User.email == data.email).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="邮箱已被注册",
            )
        user = User(
            username=data.username,
            email=data.email,
            full_name=data.full_name,
            hashed_password=get_password_hash(data.password),
            is_active=data.is_active,
            must_change_password=False,
        )
        self.db.add(user)
        self.db.flush()
        if data.role_ids:
            self.replace_roles(user, list(data.role_ids))
        self.db.refresh(user)
        return user

    def assert_can_delete(self, target: User, actor_id: UUID) -> None:
        if target.id == actor_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="不能删除自己的账号",
            )
        admin_rid = self._admin_role().id
        role_ids = {ur.role_id for ur in target.user_roles}
        if not (target.is_active and admin_rid in role_ids):
            return
        others = 0
        for u in self.db.query(User).options(selectinload(User.user_roles)).all():
            if u.id == target.id:
                continue
            rids = {ur.role_id for ur in u.user_roles}
            if u.is_active and admin_rid in rids:
                others += 1
        if others < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="须至少保留一名可用的管理员",
            )

    def delete_user(self, target: User, actor_id: UUID) -> None:
        self.assert_can_delete(target, actor_id)
        self.db.delete(target)

    def get_user(self, user_id: UUID) -> User | None:
        return (
            self.db.query(User)
            .options(selectinload(User.user_roles).selectinload(UserRole.role))
            .filter(User.id == user_id)
            .first()
        )

    def to_list_item(self, u: User) -> AdminUserListItem:
        roles = []
        for ur in u.user_roles:
            if ur.role:
                roles.append(RoleBrief(id=ur.role.id, name=ur.role.name))
        roles.sort(key=lambda r: r.name)
        return AdminUserListItem(
            id=u.id,
            username=u.username,
            email=u.email,
            full_name=u.full_name,
            is_active=u.is_active,
            must_change_password=u.must_change_password,
            created_at=u.created_at,
            roles=roles,
        )

    def replace_roles(self, user: User, role_ids: list[UUID]) -> None:
        if role_ids:
            roles = self.db.query(Role).filter(Role.id.in_(role_ids)).all()
            if len(roles) != len(set(role_ids)):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="存在无效的角色 ID",
                )
        self.db.query(UserRole).filter(UserRole.user_id == user.id).delete(synchronize_session=False)
        for rid in role_ids:
            self.db.add(UserRole(user_id=user.id, role_id=rid))
        self.db.flush()
        self.db.refresh(user)

    def apply_patch(self, user: User, actor_id: UUID, is_active: bool | None, role_ids: list[UUID] | None) -> None:
        if is_active is None and role_ids is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="至少需要提供 is_active 或 role_ids",
            )
        self.assert_can_apply_patch(user, actor_id, is_active, role_ids)
        if is_active is not None:
            user.is_active = is_active
        if role_ids is not None:
            self.replace_roles(user, role_ids)

    def reset_temp_password(self, user: User, actor_id: UUID) -> str:
        if user.id == actor_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="不能为自己生成临时密码",
            )
        raw = secrets.token_urlsafe(16)
        user.hashed_password = get_password_hash(raw)
        user.must_change_password = True
        return raw
