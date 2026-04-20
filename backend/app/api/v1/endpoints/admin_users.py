"""Admin-only user and role management."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user, get_db, require_users_manage
from app.models.role import Role
from app.models.user import User
from app.schemas.admin_user import (
    AdminUserCreate,
    AdminUserListItem,
    AdminUserListResponse,
    AdminUserUpdate,
    RoleListItem,
    TempPasswordResponse,
)
from app.services.admin_user_service import AdminUserService

router = APIRouter(dependencies=[Depends(require_users_manage)])


@router.get("/roles", response_model=list[RoleListItem])
def admin_list_roles(db: Session = Depends(get_db)):
    roles = db.query(Role).order_by(Role.name).all()
    return [
        RoleListItem(id=r.id, name=r.name, description=r.description) for r in roles
    ]


@router.post("/users", response_model=AdminUserListItem, status_code=status.HTTP_201_CREATED)
def admin_create_user(
    body: AdminUserCreate,
    db: Session = Depends(get_db),
):
    svc = AdminUserService(db)
    user = svc.create_user(body)
    db.commit()
    user = svc.get_user(user.id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="创建用户后加载失败",
        )
    return svc.to_list_item(user)


@router.get("/users", response_model=AdminUserListResponse)
def admin_list_users(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str | None = None,
):
    svc = AdminUserService(db)
    items, total = svc.list_users(page, page_size, q)
    return AdminUserListResponse(items=items, total=total)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    svc = AdminUserService(db)
    user = svc.get_user(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")
    svc.delete_user(user, current_user.id)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/users/{user_id}", response_model=AdminUserListItem)
def admin_get_user(user_id: UUID, db: Session = Depends(get_db)):
    svc = AdminUserService(db)
    user = svc.get_user(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")
    return svc.to_list_item(user)


@router.patch("/users/{user_id}", response_model=AdminUserListItem)
def admin_patch_user(
    user_id: UUID,
    body: AdminUserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    svc = AdminUserService(db)
    user = svc.get_user(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")
    svc.apply_patch(user, current_user.id, body.is_active, body.role_ids)
    db.commit()
    db.refresh(user)
    return svc.to_list_item(user)


@router.post("/users/{user_id}/reset-temp-password", response_model=TempPasswordResponse)
def admin_reset_temp_password(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    svc = AdminUserService(db)
    user = svc.get_user(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")
    temp = svc.reset_temp_password(user, current_user.id)
    db.commit()
    return TempPasswordResponse(temp_password=temp)
