from __future__ import annotations

from datetime import date
from typing import Any

from app.mcp.helpers import db_session, dump, get_user_id, tool_error
from app.models.daily_plan import DailyTaskStatus
from app.models.task_context import TaskContext
from app.schemas.daily_progress import (
    DailyPlanCreate,
    DailyPlanTaskAdd,
    DailyPlanUpdate,
    DailyTaskUpdate,
)
from app.services.backlog_task_service import BacklogTaskService
from app.services.daily_progress_service import DailyProgressService

ACTION_ALIASES: dict[str, str] = {
    "list_by_range": "list",
    "ensure_day": "create",
    "list_entries": "list_tasks",
    "link_entry": "add_task",
    "unlink_entry": "remove_task",
}

NOT_FOUND_DAY = "Daily progress not found for this date"
NOT_FOUND_PROGRESS = "Daily progress not found"
NOT_FOUND_ENTRY = "Daily progress entry not found"


def normalize_daily_progress_action(action: str) -> str:
    return ACTION_ALIASES.get(action, action)


def parse_context_filter(value: Any) -> TaskContext | None:
    if value is None or value == "" or value == "all":
        return None
    if isinstance(value, TaskContext):
        return value
    return TaskContext(str(value))


def list_plan_responses(
    service: DailyProgressService,
    user_id: str,
    *,
    start_date: date | None,
    end_date: date | None,
    context: TaskContext | None,
) -> list[Any]:
    plans = service.get_user_plans(
        user_id,
        start_date=start_date,
        end_date=end_date,
    )
    plan_responses = [service.to_plan_response(plan, context=context) for plan in plans]
    if context is not None:
        plan_responses = [plan for plan in plan_responses if plan.total_tasks > 0]
    return plan_responses


def handle_daily_progress(payload: dict[str, Any]) -> dict[str, Any]:
    raw_action = payload.get("action")
    if not raw_action:
        tool_error(422, "VALIDATION_ERROR", "action is required")

    action = normalize_daily_progress_action(str(raw_action))
    user_id = get_user_id()
    context = parse_context_filter(payload.get("context"))

    with db_session() as db:
        service = DailyProgressService(db)
        backlog_service = BacklogTaskService(db)

        if action == "get_by_date":
            plan_date = _parse_date(payload.get("plan_date"))
            if not plan_date:
                tool_error(422, "VALIDATION_ERROR", "plan_date is required")
            plan = service.get_plan_by_date(user_id, plan_date)
            if not plan:
                return {"plan": None, "plan_date": plan_date.isoformat(), "total": 0}
            response = service.to_plan_response(plan, context=context)
            if context is not None and response.total_tasks == 0:
                return {"plan": None, "plan_date": plan_date.isoformat(), "total": 0}
            return {"plan": dump(response), "plan_date": plan_date.isoformat(), "total": response.total_tasks}

        if action == "list":
            plan_responses = list_plan_responses(
                service,
                user_id,
                start_date=_parse_date(payload.get("start_date")),
                end_date=_parse_date(payload.get("end_date")),
                context=context,
            )
            return {"plans": dump(plan_responses), "total": len(plan_responses)}

        if action == "create":
            body = DailyPlanCreate.model_validate(payload.get("data") or payload)
            plan, _created = service.create_or_merge_plan(user_id, body)
            return dump(service.to_plan_response(plan, context=context))

        if action == "get":
            plan_id = payload.get("plan_id")
            if not plan_id:
                tool_error(422, "VALIDATION_ERROR", "plan_id is required")
            plan = service.get_plan(plan_id)
            if not plan or str(plan.user_id) != user_id:
                tool_error(404, "NOT_FOUND", NOT_FOUND_PROGRESS)
            response = service.to_plan_response(plan, context=context)
            return dump(response)

        if action == "update":
            plan_id = payload.get("plan_id")
            if not plan_id:
                tool_error(422, "VALIDATION_ERROR", "plan_id is required")
            plan = service.get_plan(plan_id)
            if not plan or str(plan.user_id) != user_id:
                tool_error(404, "NOT_FOUND", NOT_FOUND_PROGRESS)
            body = DailyPlanUpdate.model_validate(payload.get("data") or payload)
            updated = service.update_plan(plan_id, body)
            if not updated:
                tool_error(404, "NOT_FOUND", NOT_FOUND_PROGRESS)
            return dump(service.to_plan_response(updated, context=context))

        if action == "delete":
            plan_id = payload.get("plan_id")
            if not plan_id:
                tool_error(422, "VALIDATION_ERROR", "plan_id is required")
            plan = service.get_plan(plan_id)
            if not plan or str(plan.user_id) != user_id:
                tool_error(404, "NOT_FOUND", NOT_FOUND_PROGRESS)
            service.delete_plan(plan_id)
            return {"deleted": True, "plan_id": plan_id}

        if action == "list_tasks":
            plan_id = payload.get("plan_id")
            if not plan_id:
                tool_error(422, "VALIDATION_ERROR", "plan_id is required")
            plan = service.get_plan(plan_id)
            if not plan or str(plan.user_id) != user_id:
                tool_error(404, "NOT_FOUND", NOT_FOUND_PROGRESS)
            tasks = service.get_plan_tasks(plan_id)
            if context is not None:
                tasks = [task for task in tasks if task.context == context]
            return {"tasks": dump([service.to_task_response(task) for task in tasks])}

        if action == "add_task":
            plan_id = payload.get("plan_id")
            if not plan_id:
                tool_error(422, "VALIDATION_ERROR", "plan_id is required")
            plan = service.get_plan(plan_id)
            if not plan or str(plan.user_id) != user_id:
                tool_error(404, "NOT_FOUND", NOT_FOUND_PROGRESS)
            body = DailyPlanTaskAdd.model_validate(payload.get("data") or payload)
            task = backlog_service.add_to_daily_plan(user_id, plan_id, body)
            if not task:
                tool_error(400, "VALIDATION_ERROR", "Unable to link backlog task to daily progress")
            return dump(service.to_task_response(task))

        if action == "update_task":
            task_id = payload.get("task_id")
            if not task_id:
                tool_error(422, "VALIDATION_ERROR", "task_id is required")
            task = service.get_task(task_id)
            if not task:
                tool_error(404, "NOT_FOUND", NOT_FOUND_ENTRY)
            plan = service.get_plan(str(task.daily_plan_id))
            if not plan or str(plan.user_id) != user_id:
                tool_error(403, "FORBIDDEN", "Not authorized")
            body = DailyTaskUpdate.model_validate(payload.get("data") or payload)
            updated = service.update_task(task_id, body)
            if not updated:
                tool_error(404, "NOT_FOUND", NOT_FOUND_ENTRY)
            return dump(service.to_task_response(updated))

        if action == "set_task_status":
            task_id = payload.get("task_id")
            status = payload.get("status")
            if not task_id or not status:
                tool_error(422, "VALIDATION_ERROR", "task_id and status are required")
            task = service.get_task(task_id)
            if not task:
                tool_error(404, "NOT_FOUND", NOT_FOUND_ENTRY)
            plan = service.get_plan(str(task.daily_plan_id))
            if not plan or str(plan.user_id) != user_id:
                tool_error(403, "FORBIDDEN", "Not authorized")
            updated = service.update_task_status(task_id, DailyTaskStatus(status))
            if not updated:
                tool_error(404, "NOT_FOUND", NOT_FOUND_ENTRY)
            return dump(service.to_task_response(updated))

        if action == "remove_task":
            task_id = payload.get("task_id")
            if not task_id:
                tool_error(422, "VALIDATION_ERROR", "task_id is required")
            task = service.get_task(task_id)
            if not task:
                tool_error(404, "NOT_FOUND", NOT_FOUND_ENTRY)
            plan = service.get_plan(str(task.daily_plan_id))
            if not plan or str(plan.user_id) != user_id:
                tool_error(403, "FORBIDDEN", "Not authorized")
            service.delete_task(task_id)
            return {"deleted": True, "task_id": task_id}

    tool_error(422, "VALIDATION_ERROR", f"Unknown daily_progress action: {raw_action}")


def _parse_date(value: Any) -> date | None:
    if value is None:
        return None
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value))
