from __future__ import annotations

from typing import Any
from uuid import UUID

from app.mcp.helpers import db_session, dump, get_user_id, require_permission, tool_error
from app.models.role import Role
from app.schemas.admin_user import AdminUserCreate, AdminUserUpdate
from app.schemas.task_data_repair import DataRepairRunRequest, MergeBacklogRequest
from app.services.admin_user_service import AdminUserService
from app.services.backlog_task_service import BacklogTaskService
from app.services.rbac_service import SYSTEM_STATUS_READ, USERS_MANAGE
from app.services.system_status_service import SystemStatusService
from app.services.task_data_repair_service import TaskDataRepairService

_ADMIN_ACTION_PERMISSIONS: dict[str, str] = {
    "list_users": USERS_MANAGE,
    "create_user": USERS_MANAGE,
    "update_user": USERS_MANAGE,
    "delete_user": USERS_MANAGE,
    "reset_temp_password": USERS_MANAGE,
    "list_roles": USERS_MANAGE,
    "system_status": SYSTEM_STATUS_READ,
    "repair_preview": USERS_MANAGE,
    "repair_run": USERS_MANAGE,
    "repair_merge": USERS_MANAGE,
}


def handle_admin(payload: dict[str, Any]) -> dict[str, Any]:
    action = payload.get("action")
    if not action:
        tool_error(422, "VALIDATION_ERROR", "action is required")

    required = _ADMIN_ACTION_PERMISSIONS.get(action)
    if not required:
        tool_error(422, "VALIDATION_ERROR", f"Unknown admin action: {action}")
    require_permission(required)

    user_id = get_user_id()
    actor_id = UUID(user_id)

    with db_session() as db:
        if action == "system_status":
            return dump(SystemStatusService(db).run())

        if action == "repair_preview":
            return dump(TaskDataRepairService(db).preview(user_id))

        if action == "repair_run":
            body = DataRepairRunRequest.model_validate(payload.get("data") or payload)
            return dump(TaskDataRepairService(db).run(user_id, dry_run=body.dry_run))

        if action == "repair_merge":
            body = MergeBacklogRequest.model_validate(payload.get("data") or payload)
            repair = TaskDataRepairService(db)
            ok = repair.merge_backlogs(user_id, str(body.keeper_id), str(body.merge_id))
            if not ok:
                tool_error(400, "VALIDATION_ERROR", "Unable to merge backlog tasks")
            db.commit()
            service = BacklogTaskService(db)
            task = service.get_task(str(body.keeper_id))
            if not task:
                tool_error(404, "NOT_FOUND", "Backlog task not found")
            dup_counts = repair.compute_fuzzy_duplicate_counts(user_id, [str(task.id)])
            return dump(service.to_response(task, possible_duplicate_count=dup_counts.get(str(task.id), 0)))

        admin_service = AdminUserService(db)

        if action == "list_roles":
            roles = db.query(Role).order_by(Role.name).all()
            return {
                "roles": [
                    {"id": str(r.id), "name": r.name, "description": r.description} for r in roles
                ]
            }

        if action == "list_users":
            page = int(payload.get("page", 1))
            page_size = int(payload.get("page_size", 20))
            items, total = admin_service.list_users(page, page_size, payload.get("q"))
            return {"items": dump(items), "total": total}

        if action == "create_user":
            body = AdminUserCreate.model_validate(payload.get("data") or payload)
            user = admin_service.create_user(body)
            db.commit()
            user = admin_service.get_user(user.id)
            if not user:
                tool_error(500, "ERROR", "Failed to load created user")
            return dump(admin_service.to_list_item(user))

        if action == "update_user":
            target_id = payload.get("user_id")
            if not target_id:
                tool_error(422, "VALIDATION_ERROR", "user_id is required")
            user = admin_service.get_user(UUID(str(target_id)))
            if not user:
                tool_error(404, "NOT_FOUND", "User not found")
            body = AdminUserUpdate.model_validate(payload.get("data") or payload)
            admin_service.apply_patch(
                user,
                actor_id,
                is_active=body.is_active,
                role_ids=body.role_ids,
            )
            db.commit()
            user = admin_service.get_user(user.id)
            if not user:
                tool_error(404, "NOT_FOUND", "User not found")
            return dump(admin_service.to_list_item(user))

        if action == "delete_user":
            target_id = payload.get("user_id")
            if not target_id:
                tool_error(422, "VALIDATION_ERROR", "user_id is required")
            user = admin_service.get_user(UUID(str(target_id)))
            if not user:
                tool_error(404, "NOT_FOUND", "User not found")
            admin_service.delete_user(user, actor_id)
            db.commit()
            return {"deleted": True, "user_id": str(target_id)}

        if action == "reset_temp_password":
            target_id = payload.get("user_id")
            if not target_id:
                tool_error(422, "VALIDATION_ERROR", "user_id is required")
            user = admin_service.get_user(UUID(str(target_id)))
            if not user:
                tool_error(404, "NOT_FOUND", "User not found")
            temp_password = admin_service.reset_temp_password(user, actor_id)
            db.commit()
            return {"user_id": str(target_id), "temp_password": temp_password}

    tool_error(422, "VALIDATION_ERROR", f"Unknown admin action: {action}")


def admin_tool_visible(ctx) -> bool:
    from fastmcp.server.auth import AuthContext

    if not isinstance(ctx, AuthContext) or ctx.token is None:
        return False
    perms = set(ctx.token.scopes)
    return USERS_MANAGE in perms or SYSTEM_STATUS_READ in perms
