from __future__ import annotations

from datetime import date
from typing import Any

from app.mcp.helpers import db_session, dump, get_user_id, tool_error
from app.models.backlog_task import BacklogTask
from app.schemas.backlog_task import BacklogTaskCreate, BacklogTaskSchedule, BacklogTaskUpdate
from app.services.backlog_task_service import BacklogTaskService
from app.services.task_data_repair_service import TaskDataRepairService


def handle_todo(payload: dict[str, Any]) -> dict[str, Any]:
    action = payload.get("action")
    if not action:
        tool_error(422, "VALIDATION_ERROR", "action is required")

    user_id = get_user_id()

    with db_session() as db:
        service = BacklogTaskService(db)

        if action == "list":
            tab = payload.get("tab", "pending")
            tasks, total = service.get_user_tasks(
                user_id,
                tab=tab,
                context=payload.get("context"),
                priority=payload.get("priority"),
                q=payload.get("q"),
                time_field=payload.get("time_field"),
                date_from=_parse_date(payload.get("date_from")),
                date_to=_parse_date(payload.get("date_to")),
                limit=payload.get("limit"),
                offset=int(payload.get("offset", 0)),
            )
            repair = TaskDataRepairService(db)
            dup_counts = repair.compute_fuzzy_duplicate_counts(user_id, [str(t.id) for t in tasks])
            return {
                "tasks": [
                    dump(service.to_response(t, possible_duplicate_count=dup_counts.get(str(t.id), 0)))
                    for t in tasks
                ],
                "total": total,
                "note": "Use tasks[].id as task_id for get/update/delete/complete/schedule/revert.",
            }

        if action == "get":
            task_id = _resolve_task_id(service, user_id, payload, action="get")
            task = service.get_task(task_id)
            if not task or str(task.user_id) != user_id:
                tool_error(404, "NOT_FOUND", "Backlog task not found")
            return dump(service.to_detail(task))

        if action == "create":
            body = BacklogTaskCreate.model_validate(payload.get("data") or payload)
            task = service.create_task(user_id, body)
            return dump(service.to_response(task))

        if action == "update":
            task_id = _resolve_task_id(service, user_id, payload, action="update")
            task = service.get_task(task_id)
            if not task or str(task.user_id) != user_id:
                tool_error(404, "NOT_FOUND", "Backlog task not found")
            body = BacklogTaskUpdate.model_validate(payload.get("data") or payload)
            updated = service.update_task(task_id, body)
            if not updated:
                tool_error(404, "NOT_FOUND", "Backlog task not found")
            return dump(service.to_response(updated))

        if action == "delete":
            task_id = _resolve_task_id(service, user_id, payload, action="delete")
            task = service.get_task(task_id)
            if not task or str(task.user_id) != user_id:
                tool_error(404, "NOT_FOUND", "Backlog task not found")
            title = task.title
            deleted = service.delete_task(task_id)
            if not deleted:
                tool_error(404, "NOT_FOUND", "Backlog task not found")
            return {"deleted": True, "task_id": task_id, "title": title}

        if action == "complete":
            task_id = _resolve_task_id(service, user_id, payload, action="complete")
            task = service.get_task(task_id)
            if not task or str(task.user_id) != user_id:
                tool_error(404, "NOT_FOUND", "Backlog task not found")
            completed = service.complete_task(task_id)
            if not completed:
                tool_error(404, "NOT_FOUND", "Backlog task not found")
            return dump(service.to_response(completed))

        if action == "schedule":
            task_id = _resolve_task_id(service, user_id, payload, action="schedule")
            task = service.get_task(task_id)
            if not task or str(task.user_id) != user_id:
                tool_error(404, "NOT_FOUND", "Backlog task not found")
            schedule_data = payload.get("data") or payload
            body = BacklogTaskSchedule.model_validate(schedule_data)
            scheduled = service.schedule_task(user_id, task_id, body)
            if not scheduled:
                tool_error(404, "NOT_FOUND", "Backlog task not found")
            return dump(service.to_response(scheduled))

        if action == "revert":
            task_id = _resolve_task_id(service, user_id, payload, action="revert")
            task = service.get_task(task_id)
            if not task or str(task.user_id) != user_id:
                tool_error(404, "NOT_FOUND", "Backlog task not found")
            reverted = service.revert_to_inbox(task_id)
            if not reverted:
                tool_error(404, "NOT_FOUND", "Backlog task not found")
            return dump(service.to_response(reverted))

    tool_error(422, "VALIDATION_ERROR", f"Unknown todo action: {action}")


def _resolve_task_id(
    service: BacklogTaskService,
    user_id: str,
    payload: dict[str, Any],
    *,
    action: str,
) -> str:
    task_id = payload.get("task_id") or payload.get("id")
    if task_id:
        return str(task_id)

    title = (payload.get("title") or "").strip()
    if not title:
        tool_error(
            422,
            "VALIDATION_ERROR",
            f"task_id is required for {action}; call list first and copy tasks[].id exactly",
        )

    matches: list[BacklogTask] = []
    for tab in ("pending", "in_progress", "done"):
        tasks, _ = service.get_user_tasks(user_id, tab=tab, q=title, limit=50)
        matches.extend(task for task in tasks if task.title == title)

    unique = {str(task.id): task for task in matches}
    if len(unique) == 1:
        return next(iter(unique))
    if len(unique) > 1:
        tool_error(
            422,
            "AMBIGUOUS",
            f"Multiple tasks match title {title!r}; pass task_id from list",
        )
    tool_error(
        404,
        "NOT_FOUND",
        f"No task found with title {title!r}; call list and use tasks[].id",
    )


def _parse_date(value: Any) -> date | None:
    if value is None:
        return None
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value))
