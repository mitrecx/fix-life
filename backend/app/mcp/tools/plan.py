from __future__ import annotations

from typing import Any

from app.mcp.helpers import db_session, dump, get_user_id, tool_error
from app.models.monthly_plan import TaskStatus
from app.schemas.monthly_plan import (
    MonthlyPlanCreate,
    MonthlyPlanUpdate,
    MonthlyTaskCreate,
    MonthlyTaskUpdate,
)
from app.schemas.yearly_goal import ProgressUpdate, YearlyGoalCreate, YearlyGoalUpdate
from app.services.monthly_plan_service import MonthlyPlanService
from app.services.yearly_goal_service import YearlyGoalService


def handle_plan(payload: dict[str, Any]) -> dict[str, Any]:
    action = payload.get("action")
    if not action:
        tool_error(422, "VALIDATION_ERROR", "action is required")

    user_id = get_user_id()

    with db_session() as db:
        yearly_service = YearlyGoalService(db)
        monthly_service = MonthlyPlanService(db)

        if action == "list_yearly":
            goals = yearly_service.get_user_goals(
                user_id,
                year=payload.get("year"),
                category=payload.get("category"),
                status=payload.get("status"),
            )
            return {"goals": dump(goals), "total": len(goals)}

        if action == "create_yearly":
            body = YearlyGoalCreate.model_validate(payload.get("data") or payload)
            goal = yearly_service.create_goal(user_id, body)
            return dump(goal)

        if action == "get_yearly":
            goal_id = payload.get("goal_id")
            if not goal_id:
                tool_error(422, "VALIDATION_ERROR", "goal_id is required")
            goal = yearly_service.get_goal(goal_id)
            if not goal or str(goal.user_id) != user_id:
                tool_error(404, "NOT_FOUND", "Yearly goal not found")
            return dump(goal)

        if action == "update_yearly":
            goal_id = payload.get("goal_id")
            if not goal_id:
                tool_error(422, "VALIDATION_ERROR", "goal_id is required")
            goal = yearly_service.get_goal(goal_id)
            if not goal or str(goal.user_id) != user_id:
                tool_error(404, "NOT_FOUND", "Yearly goal not found")
            body = YearlyGoalUpdate.model_validate(payload.get("data") or payload)
            updated = yearly_service.update_goal(goal_id, body)
            if not updated:
                tool_error(404, "NOT_FOUND", "Yearly goal not found")
            return dump(updated)

        if action == "update_yearly_progress":
            goal_id = payload.get("goal_id")
            if not goal_id:
                tool_error(422, "VALIDATION_ERROR", "goal_id is required")
            goal = yearly_service.get_goal(goal_id)
            if not goal or str(goal.user_id) != user_id:
                tool_error(404, "NOT_FOUND", "Yearly goal not found")
            body = ProgressUpdate.model_validate(payload.get("data") or payload)
            updated = yearly_service.update_progress(goal_id, body)
            if not updated:
                tool_error(404, "NOT_FOUND", "Yearly goal not found")
            return dump(updated)

        if action == "delete_yearly":
            goal_id = payload.get("goal_id")
            if not goal_id:
                tool_error(422, "VALIDATION_ERROR", "goal_id is required")
            goal = yearly_service.get_goal(goal_id)
            if not goal or str(goal.user_id) != user_id:
                tool_error(404, "NOT_FOUND", "Yearly goal not found")
            yearly_service.delete_goal(goal_id)
            return {"deleted": True, "goal_id": goal_id}

        if action == "list_monthly":
            plans = monthly_service.get_user_plans(
                user_id,
                year=payload.get("year"),
                month=payload.get("month"),
            )
            return {"plans": dump(plans), "total": len(plans)}

        if action == "create_monthly":
            body = MonthlyPlanCreate.model_validate(payload.get("data") or payload)
            plan = monthly_service.create_plan(user_id, body)
            return dump(plan)

        if action == "get_monthly":
            plan_id = payload.get("plan_id")
            if not plan_id:
                tool_error(422, "VALIDATION_ERROR", "plan_id is required")
            plan = monthly_service.get_plan(plan_id)
            if not plan or str(plan.user_id) != user_id:
                tool_error(404, "NOT_FOUND", "Monthly plan not found")
            tasks = monthly_service.get_plan_tasks(plan_id)
            return {"plan": dump(plan), "tasks": dump(tasks)}

        if action == "update_monthly":
            plan_id = payload.get("plan_id")
            if not plan_id:
                tool_error(422, "VALIDATION_ERROR", "plan_id is required")
            plan = monthly_service.get_plan(plan_id)
            if not plan or str(plan.user_id) != user_id:
                tool_error(404, "NOT_FOUND", "Monthly plan not found")
            body = MonthlyPlanUpdate.model_validate(payload.get("data") or payload)
            updated = monthly_service.update_plan(plan_id, body)
            if not updated:
                tool_error(404, "NOT_FOUND", "Monthly plan not found")
            return dump(updated)

        if action == "delete_monthly":
            plan_id = payload.get("plan_id")
            if not plan_id:
                tool_error(422, "VALIDATION_ERROR", "plan_id is required")
            plan = monthly_service.get_plan(plan_id)
            if not plan or str(plan.user_id) != user_id:
                tool_error(404, "NOT_FOUND", "Monthly plan not found")
            monthly_service.delete_plan(plan_id)
            return {"deleted": True, "plan_id": plan_id}

        if action == "list_monthly_tasks":
            plan_id = payload.get("plan_id")
            if not plan_id:
                tool_error(422, "VALIDATION_ERROR", "plan_id is required")
            plan = monthly_service.get_plan(plan_id)
            if not plan or str(plan.user_id) != user_id:
                tool_error(404, "NOT_FOUND", "Monthly plan not found")
            return {"tasks": dump(monthly_service.get_plan_tasks(plan_id))}

        if action == "create_monthly_task":
            plan_id = payload.get("plan_id")
            if not plan_id:
                tool_error(422, "VALIDATION_ERROR", "plan_id is required")
            plan = monthly_service.get_plan(plan_id)
            if not plan or str(plan.user_id) != user_id:
                tool_error(404, "NOT_FOUND", "Monthly plan not found")
            body = MonthlyTaskCreate.model_validate(payload.get("data") or payload)
            task = monthly_service.create_task(plan_id, body)
            if not task:
                tool_error(400, "VALIDATION_ERROR", "Unable to create monthly task")
            return dump(task)

        if action == "update_monthly_task":
            task_id = payload.get("task_id")
            if not task_id:
                tool_error(422, "VALIDATION_ERROR", "task_id is required")
            task = monthly_service.get_task(task_id)
            if not task:
                tool_error(404, "NOT_FOUND", "Monthly task not found")
            plan = monthly_service.get_plan(str(task.monthly_plan_id))
            if not plan or str(plan.user_id) != user_id:
                tool_error(403, "FORBIDDEN", "Not authorized")
            body = MonthlyTaskUpdate.model_validate(payload.get("data") or payload)
            updated = monthly_service.update_task(task_id, body)
            if not updated:
                tool_error(404, "NOT_FOUND", "Monthly task not found")
            return dump(updated)

        if action == "set_monthly_task_status":
            task_id = payload.get("task_id")
            status = payload.get("status")
            if not task_id or not status:
                tool_error(422, "VALIDATION_ERROR", "task_id and status are required")
            task = monthly_service.get_task(task_id)
            if not task:
                tool_error(404, "NOT_FOUND", "Monthly task not found")
            plan = monthly_service.get_plan(str(task.monthly_plan_id))
            if not plan or str(plan.user_id) != user_id:
                tool_error(403, "FORBIDDEN", "Not authorized")
            updated = monthly_service.update_task_status(task_id, TaskStatus(status))
            if not updated:
                tool_error(404, "NOT_FOUND", "Monthly task not found")
            return dump(updated)

        if action == "delete_monthly_task":
            task_id = payload.get("task_id")
            if not task_id:
                tool_error(422, "VALIDATION_ERROR", "task_id is required")
            task = monthly_service.get_task(task_id)
            if not task:
                tool_error(404, "NOT_FOUND", "Monthly task not found")
            plan = monthly_service.get_plan(str(task.monthly_plan_id))
            if not plan or str(plan.user_id) != user_id:
                tool_error(403, "FORBIDDEN", "Not authorized")
            monthly_service.delete_task(task_id)
            return {"deleted": True, "task_id": task_id}

    tool_error(422, "VALIDATION_ERROR", f"Unknown plan action: {action}")
