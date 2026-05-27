from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Body, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.api.v1.deps import get_db, get_current_user
from app.models.user import User
from app.models.daily_plan import DailyTaskStatus
from app.models.task_context import TaskContext
from app.schemas.daily_plan import (
    DailyPlanCreate,
    DailyPlanUpdate,
    DailyPlanResponse,
    DailyPlanList,
    DailyPlanByDateResponse,
    DailyTaskCreate,
    DailyTaskUpdate,
    DailyTaskResponse,
    DailyPlanTaskAdd,
)
from app.services.daily_plan_service import DailyPlanService
from app.services.backlog_task_service import BacklogTaskService

router = APIRouter()


@router.get("/", response_model=DailyPlanList)
def get_daily_plans(
    start_date: date = Query(None, description="Filter by start date"),
    end_date: date = Query(None, description="Filter by end date"),
    context: Optional[TaskContext] = Query(None, description="Filter tasks by context"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all daily plans for the current user."""
    service = DailyPlanService(db)
    plans = service.get_user_plans(
        user_id=str(current_user.id),
        start_date=start_date,
        end_date=end_date,
    )
    plan_responses = [
        service.to_plan_response(plan, context=context) for plan in plans
    ]
    if context is not None:
        plan_responses = [plan for plan in plan_responses if plan.total_tasks > 0]
    return DailyPlanList(
        plans=plan_responses,
        total=len(plan_responses),
    )


@router.get("/by-date/{plan_date}", response_model=DailyPlanByDateResponse)
def get_daily_plan_by_date(
    plan_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lightweight lookup: plan for this user on plan_date (no nested tasks)."""
    service = DailyPlanService(db)
    plan = service.get_plan_head_by_date(str(current_user.id), plan_date)
    if not plan:
        raise HTTPException(status_code=404, detail="No daily plan for this date")
    return plan


@router.post("/", response_model=DailyPlanResponse)
def create_daily_plan(
    plan_in: DailyPlanCreate,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new daily plan, or merge into existing plan for the same date."""
    service = DailyPlanService(db)
    plan, created = service.create_or_merge_plan(str(current_user.id), plan_in)
    response.status_code = 201 if created else 200
    return service.to_plan_response(plan)


@router.get("/{plan_id}", response_model=DailyPlanResponse)
def get_daily_plan(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific daily plan by ID."""
    service = DailyPlanService(db)
    plan = service.get_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Daily plan not found")
    if str(plan.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to access this plan")
    return service.to_plan_response(plan)


@router.put("/{plan_id}", response_model=DailyPlanResponse)
def update_daily_plan(
    plan_id: str,
    plan_in: DailyPlanUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a daily plan."""
    service = DailyPlanService(db)
    plan = service.get_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Daily plan not found")
    if str(plan.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to update this plan")

    updated_plan = service.update_plan(plan_id, plan_in)
    return service.to_plan_response(updated_plan)


@router.delete("/{plan_id}", status_code=204)
def delete_daily_plan(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a daily plan."""
    service = DailyPlanService(db)
    plan = service.get_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Daily plan not found")
    if str(plan.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to delete this plan")

    service.delete_plan(plan_id)
    return None


# ===== Task Endpoints =====

@router.get("/{plan_id}/tasks", response_model=List[DailyTaskResponse])
def get_daily_tasks(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all tasks for a daily plan."""
    service = DailyPlanService(db)
    plan = service.get_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Daily plan not found")
    if str(plan.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to access this plan")

    tasks = service.get_plan_tasks(plan_id)
    return [service.to_task_response(task) for task in tasks]


@router.post("/{plan_id}/tasks", response_model=DailyTaskResponse, status_code=201)
def create_daily_task(
    plan_id: str,
    task_in: DailyPlanTaskAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Link an existing backlog task to this day, or create a new backlog task and link it."""
    daily_service = DailyPlanService(db)
    plan = daily_service.get_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Daily plan not found")
    if str(plan.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to modify this plan")

    backlog_service = BacklogTaskService(db)
    task = backlog_service.add_to_daily_plan(str(current_user.id), plan_id, task_in)
    if not task:
        raise HTTPException(status_code=400, detail="Unable to add task to daily plan")
    return daily_service.to_task_response(task)


@router.put("/tasks/{task_id}", response_model=DailyTaskResponse)
def update_daily_task(
    task_id: str,
    task_in: DailyTaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a daily task."""
    service = DailyPlanService(db)
    task = service.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Daily task not found")

    # Check if user owns the parent plan
    plan = service.get_plan(str(task.daily_plan_id))
    if not plan or str(plan.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to update this task")

    updated_task = service.update_task(task_id, task_in)
    if updated_task and task_in.status is not None:
        BacklogTaskService(db).sync_from_daily_task(
            str(updated_task.id),
            is_done=updated_task.status == DailyTaskStatus.DONE,
        )
    return service.to_task_response(updated_task) if updated_task else updated_task


@router.delete("/tasks/{task_id}", status_code=204)
def delete_daily_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a daily task."""
    service = DailyPlanService(db)
    task = service.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Daily task not found")

    # Check if user owns the parent plan
    plan = service.get_plan(str(task.daily_plan_id))
    if not plan or str(plan.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to delete this task")

    service.delete_task(task_id)
    return None


@router.patch("/tasks/{task_id}/status", response_model=DailyTaskResponse)
def update_task_status(
    task_id: str,
    status: DailyTaskStatus = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update the status of a daily task."""
    service = DailyPlanService(db)
    task = service.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Daily task not found")

    # Check if user owns the parent plan
    plan = service.get_plan(str(task.daily_plan_id))
    if not plan or str(plan.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to update this task")

    updated_task = service.update_task_status(task_id, status)
    if updated_task:
        BacklogTaskService(db).sync_from_daily_task(
            str(updated_task.id),
            is_done=updated_task.status == DailyTaskStatus.DONE,
        )
    return service.to_task_response(updated_task) if updated_task else updated_task
