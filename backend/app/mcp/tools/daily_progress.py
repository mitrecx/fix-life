from __future__ import annotations

from datetime import date
from typing import Any

from app.mcp.helpers import db_session, dump, get_user_id, tool_error
from app.models.daily_progress import DailyProgressEntryStatus
from app.models.task_context import TaskContext
from app.schemas.daily_progress import (
    DailyProgressDayCreate,
    DailyProgressEntryAdd,
    DailyProgressDayUpdate,
    DailyProgressEntryUpdate,
)
from app.services.backlog_task_service import BacklogTaskService
from app.services.daily_progress_service import DailyProgressService

NOT_FOUND_DAY = "Daily progress not found for this date"
NOT_FOUND_PROGRESS = "Daily progress not found"
NOT_FOUND_ENTRY = "Daily progress entry not found"

DEPRECATED_PROGRESS_RESPONSE_KEYS = frozenset({"daily_plan_id", "daily_tasks", "plan_date"})


def parse_context_filter(value: Any) -> TaskContext | None:
    if value is None or value == "" or value == "all":
        return None
    if isinstance(value, TaskContext):
        return value
    return TaskContext(str(value))


def list_day_responses(
    service: DailyProgressService,
    user_id: str,
    *,
    start_date: date | None,
    end_date: date | None,
    context: TaskContext | None,
) -> list[Any]:
    days = service.get_user_days(
        user_id,
        start_date=start_date,
        end_date=end_date,
    )
    day_responses = [service.to_day_response(day, context=context) for day in days]
    if context is not None:
        day_responses = [day for day in day_responses if day.total_tasks > 0]
    return day_responses


def dump_daily_progress(value: Any) -> Any:
    return _transform_mcp_progress_fields(dump(value))


def _transform_mcp_progress_fields(data: Any) -> Any:
    if isinstance(data, dict):
        out: dict[str, Any] = {}
        for key, item in data.items():
            if key in DEPRECATED_PROGRESS_RESPONSE_KEYS:
                continue
            out[key] = _transform_mcp_progress_fields(item)
        return out
    if isinstance(data, list):
        return [_transform_mcp_progress_fields(item) for item in data]
    return data


def require_daily_progress_day_id(payload: dict[str, Any]) -> str:
    day_id = payload.get("daily_progress_day_id")
    if not day_id:
        tool_error(422, "VALIDATION_ERROR", "daily_progress_day_id is required")
    return str(day_id)


def require_entry_id(payload: dict[str, Any]) -> str:
    entry_id = payload.get("entry_id")
    if not entry_id:
        tool_error(422, "VALIDATION_ERROR", "entry_id is required")
    return str(entry_id)


def require_progress_date(payload: dict[str, Any]) -> date:
    progress_date = _parse_date(payload.get("progress_date"))
    if not progress_date:
        tool_error(422, "VALIDATION_ERROR", "progress_date is required")
    return progress_date


def prepare_day_create_payload(payload: dict[str, Any]) -> dict[str, Any]:
    return dict(payload.get("data") or payload)


def handle_daily_progress(payload: dict[str, Any]) -> dict[str, Any]:
    action = payload.get("action")
    if not action:
        tool_error(422, "VALIDATION_ERROR", "action is required")

    action = str(action)
    user_id = get_user_id()
    context = parse_context_filter(payload.get("context"))

    with db_session() as db:
        service = DailyProgressService(db)
        backlog_service = BacklogTaskService(db)

        if action == "get_by_date":
            progress_date = require_progress_date(payload)
            day = service.get_day_by_date(user_id, progress_date)
            if not day:
                return {
                    "daily_progress_day": None,
                    "progress_date": progress_date.isoformat(),
                    "total": 0,
                }
            response = service.to_day_response(day, context=context)
            if context is not None and response.total_tasks == 0:
                return {
                    "daily_progress_day": None,
                    "progress_date": progress_date.isoformat(),
                    "total": 0,
                }
            return {
                "daily_progress_day": dump_daily_progress(response),
                "progress_date": progress_date.isoformat(),
                "total": response.total_tasks,
            }

        if action == "list_by_range":
            day_responses = list_day_responses(
                service,
                user_id,
                start_date=_parse_date(payload.get("start_date")),
                end_date=_parse_date(payload.get("end_date")),
                context=context,
            )
            return {
                "daily_progress_days": dump_daily_progress(day_responses),
                "total": len(day_responses),
            }

        if action == "ensure_day":
            body = DailyProgressDayCreate.model_validate(prepare_day_create_payload(payload))
            day, _created = service.create_or_merge_day(user_id, body)
            return dump_daily_progress(service.to_day_response(day, context=context))

        if action == "get":
            day_id = require_daily_progress_day_id(payload)
            day = service.get_day(day_id)
            if not day or str(day.user_id) != user_id:
                tool_error(404, "NOT_FOUND", NOT_FOUND_PROGRESS)
            response = service.to_day_response(day, context=context)
            return dump_daily_progress(response)

        if action == "update":
            day_id = require_daily_progress_day_id(payload)
            day = service.get_day(day_id)
            if not day or str(day.user_id) != user_id:
                tool_error(404, "NOT_FOUND", NOT_FOUND_PROGRESS)
            body = DailyProgressDayUpdate.model_validate(payload.get("data") or payload)
            updated = service.update_day(day_id, body)
            if not updated:
                tool_error(404, "NOT_FOUND", NOT_FOUND_PROGRESS)
            return dump_daily_progress(service.to_day_response(updated, context=context))

        if action == "delete":
            day_id = require_daily_progress_day_id(payload)
            day = service.get_day(day_id)
            if not day or str(day.user_id) != user_id:
                tool_error(404, "NOT_FOUND", NOT_FOUND_PROGRESS)
            service.delete_day(day_id)
            return {"deleted": True, "daily_progress_day_id": day_id}

        if action == "list_entries":
            day_id = require_daily_progress_day_id(payload)
            day = service.get_day(day_id)
            if not day or str(day.user_id) != user_id:
                tool_error(404, "NOT_FOUND", NOT_FOUND_PROGRESS)
            entries = service.get_day_entries(day_id)
            if context is not None:
                entries = [entry for entry in entries if entry.context == context]
            return {
                "daily_progress_entries": dump_daily_progress(
                    [service.to_entry_response(entry) for entry in entries]
                )
            }

        if action == "link_entry":
            day_id = require_daily_progress_day_id(payload)
            day = service.get_day(day_id)
            if not day or str(day.user_id) != user_id:
                tool_error(404, "NOT_FOUND", NOT_FOUND_PROGRESS)
            body = DailyProgressEntryAdd.model_validate(payload.get("data") or payload)
            entry = backlog_service.add_to_daily_progress_day(user_id, day_id, body)
            if not entry:
                tool_error(400, "VALIDATION_ERROR", "Unable to link backlog task to daily progress")
            return dump_daily_progress(service.to_entry_response(entry))

        if action == "update_entry":
            entry_id = require_entry_id(payload)
            entry = service.get_entry(entry_id)
            if not entry:
                tool_error(404, "NOT_FOUND", NOT_FOUND_ENTRY)
            day = service.get_day(str(entry.daily_progress_day_id))
            if not day or str(day.user_id) != user_id:
                tool_error(403, "FORBIDDEN", "Not authorized")
            body = DailyProgressEntryUpdate.model_validate(payload.get("data") or payload)
            updated = service.update_entry(entry_id, body)
            if not updated:
                tool_error(404, "NOT_FOUND", NOT_FOUND_ENTRY)
            return dump_daily_progress(service.to_entry_response(updated))

        if action == "set_entry_status":
            entry_id = require_entry_id(payload)
            status = payload.get("status")
            if not status:
                tool_error(422, "VALIDATION_ERROR", "status is required")
            entry = service.get_entry(entry_id)
            if not entry:
                tool_error(404, "NOT_FOUND", NOT_FOUND_ENTRY)
            day = service.get_day(str(entry.daily_progress_day_id))
            if not day or str(day.user_id) != user_id:
                tool_error(403, "FORBIDDEN", "Not authorized")
            updated = service.update_entry_status(entry_id, DailyProgressEntryStatus(status))
            if not updated:
                tool_error(404, "NOT_FOUND", NOT_FOUND_ENTRY)
            return dump_daily_progress(service.to_entry_response(updated))

        if action == "unlink_entry":
            entry_id = require_entry_id(payload)
            entry = service.get_entry(entry_id)
            if not entry:
                tool_error(404, "NOT_FOUND", NOT_FOUND_ENTRY)
            day = service.get_day(str(entry.daily_progress_day_id))
            if not day or str(day.user_id) != user_id:
                tool_error(403, "FORBIDDEN", "Not authorized")
            service.delete_entry(entry_id)
            return {"deleted": True, "entry_id": entry_id}

    tool_error(422, "VALIDATION_ERROR", f"Unknown daily_progress action: {action}")


def _parse_date(value: Any) -> date | None:
    if value is None:
        return None
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value))
