from __future__ import annotations

from datetime import date
from typing import Any

from app.mcp.helpers import db_session, dump, get_user_id, tool_error
from app.models.daily_plan import DailyTaskStatus
from app.schemas.daily_plan import (
    DailyPlanCreate,
    DailyPlanTaskAdd,
    DailyPlanUpdate,
    DailyTaskUpdate,
)
from app.services.backlog_task_service import BacklogTaskService
from app.services.daily_plan_service import DailyPlanService


def handle_daily(payload: dict[str, Any]) -> dict[str, Any]:
    action = payload.get("action")
    if not action:
        tool_error(422, "VALIDATION_ERROR", "action is required")

    user_id = get_user_id()

    with db_session() as db:
        service = DailyPlanService(db)
        backlog_service = BacklogTaskService(db)

        if action == "get_by_date":
            plan_date = _parse_date(payload.get("plan_date"))
            if not plan_date:
                tool_error(422, "VALIDATION_ERROR", "plan_date is required")
            plan = service.get_plan_head_by_date(user_id, plan_date)
            if not plan:
                return {"plan": None, "plan_date": plan_date.isoformat()}
            tasks = service.get_plan_tasks(str(plan.id))
            return {"plan": dump(plan), "tasks": dump(tasks), "plan_date": plan_date.isoformat()}

        if action == "list":
            plans = service.get_user_plans(
                user_id,
                start_date=_parse_date(payload.get("start_date")),
                end_date=_parse_date(payload.get("end_date")),
            )
            return {"plans": dump(plans), "total": len(plans)}

        if action == "create":
            body = DailyPlanCreate.model_validate(payload.get("data") or payload)
            plan, _created = service.create_or_merge_plan(user_id, body)
            return dump(plan)

        if action == "get":
            plan_id = payload.get("plan_id")
            if not plan_id:
                tool_error(422, "VALIDATION_ERROR", "plan_id is required")
            plan = service.get_plan(plan_id)
            if not plan or str(plan.user_id) != user_id:
                tool_error(404, "NOT_FOUND", "Daily plan not found")
            tasks = service.get_plan_tasks(plan_id)
            return {"plan": dump(plan), "tasks": dump(tasks)}

        if action == "update":
            plan_id = payload.get("plan_id")
            if not plan_id:
                tool_error(422, "VALIDATION_ERROR", "plan_id is required")
            plan = service.get_plan(plan_id)
            if not plan or str(plan.user_id) != user_id:
                tool_error(404, "NOT_FOUND", "Daily plan not found")
            body = DailyPlanUpdate.model_validate(payload.get("data") or payload)
            updated = service.update_plan(plan_id, body)
            if not updated:
                tool_error(404, "NOT_FOUND", "Daily plan not found")
            return dump(updated)

        if action == "delete":
            plan_id = payload.get("plan_id")
            if not plan_id:
                tool_error(422, "VALIDATION_ERROR", "plan_id is required")
            plan = service.get_plan(plan_id)
            if not plan or str(plan.user_id) != user_id:
                tool_error(404, "NOT_FOUND", "Daily plan not found")
            service.delete_plan(plan_id)
            return {"deleted": True, "plan_id": plan_id}

        if action == "list_tasks":
            plan_id = payload.get("plan_id")
            if not plan_id:
                tool_error(422, "VALIDATION_ERROR", "plan_id is required")
            plan = service.get_plan(plan_id)
            if not plan or str(plan.user_id) != user_id:
                tool_error(404, "NOT_FOUND", "Daily plan not found")
            return {"tasks": dump(service.get_plan_tasks(plan_id))}

        if action == "add_task":
            plan_id = payload.get("plan_id")
            if not plan_id:
                tool_error(422, "VALIDATION_ERROR", "plan_id is required")
            plan = service.get_plan(plan_id)
            if not plan or str(plan.user_id) != user_id:
                tool_error(404, "NOT_FOUND", "Daily plan not found")
            body = DailyPlanTaskAdd.model_validate(payload.get("data") or payload)
            task = backlog_service.add_to_daily_plan(user_id, plan_id, body)
            if not task:
                tool_error(400, "VALIDATION_ERROR", "Unable to add task to daily plan")
            return dump(task)

        if action == "update_task":
            task_id = payload.get("task_id")
            if not task_id:
                tool_error(422, "VALIDATION_ERROR", "task_id is required")
            task = service.get_task(task_id)
            if not task:
                tool_error(404, "NOT_FOUND", "Daily task not found")
            plan = service.get_plan(str(task.daily_plan_id))
            if not plan or str(plan.user_id) != user_id:
                tool_error(403, "FORBIDDEN", "Not authorized")
            body = DailyTaskUpdate.model_validate(payload.get("data") or payload)
            updated = service.update_task(task_id, body)
            if not updated:
                tool_error(404, "NOT_FOUND", "Daily task not found")
            return dump(updated)

        if action == "set_task_status":
            task_id = payload.get("task_id")
            status = payload.get("status")
            if not task_id or not status:
                tool_error(422, "VALIDATION_ERROR", "task_id and status are required")
            task = service.get_task(task_id)
            if not task:
                tool_error(404, "NOT_FOUND", "Daily task not found")
            plan = service.get_plan(str(task.daily_plan_id))
            if not plan or str(plan.user_id) != user_id:
                tool_error(403, "FORBIDDEN", "Not authorized")
            updated = service.update_task_status(task_id, DailyTaskStatus(status))
            if not updated:
                tool_error(404, "NOT_FOUND", "Daily task not found")
            return dump(updated)

        if action == "remove_task":
            task_id = payload.get("task_id")
            if not task_id:
                tool_error(422, "VALIDATION_ERROR", "task_id is required")
            task = service.get_task(task_id)
            if not task:
                tool_error(404, "NOT_FOUND", "Daily task not found")
            plan = service.get_plan(str(task.daily_plan_id))
            if not plan or str(plan.user_id) != user_id:
                tool_error(403, "FORBIDDEN", "Not authorized")
            service.delete_task(task_id)
            return {"deleted": True, "task_id": task_id}

    tool_error(422, "VALIDATION_ERROR", f"Unknown daily action: {action}")


def _parse_date(value: Any) -> date | None:
    if value is None:
        return None
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value))
