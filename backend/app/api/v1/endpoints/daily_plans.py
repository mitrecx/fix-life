from typing import List
from datetime import date
from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.api.v1.deps import get_db, get_current_user
from app.models.user import User
from app.models.daily_plan import DailyTaskStatus
from app.schemas.daily_plan import (
    DailyPlanCreate,
    DailyPlanUpdate,
    DailyPlanResponse,
    DailyPlanList,
    DailyTaskCreate,
    DailyTaskUpdate,
    DailyTaskResponse,
)
from app.services.daily_plan_service import DailyPlanService

router = APIRouter()


@router.get("/", response_model=DailyPlanList)
def get_daily_plans(
    start_date: date = Query(None, description="Filter by start date"),
    end_date: date = Query(None, description="Filter by end date"),
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
    return DailyPlanList(plans=plans, total=len(plans))


@router.post("/", response_model=DailyPlanResponse, status_code=201)
def create_daily_plan(
    plan_in: DailyPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new daily plan."""
    service = DailyPlanService(db)
    try:
        plan = service.create_plan(
            user_id=str(current_user.id),
            plan_in=plan_in,
        )
        return plan
    except IntegrityError as e:
        db.rollback()
        if "ix_daily_plans_user_date" in str(e):
            raise HTTPException(
                status_code=400,
                detail=f"该日期 ({plan_in.plan_date}) 的计划已存在，请选择其他日期或编辑现有计划。"
            )
        raise HTTPException(
            status_code=400,
            detail="创建失败，请检查输入数据。"
        )


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
    return plan


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
    return updated_plan


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
    return tasks


@router.post("/{plan_id}/tasks", response_model=DailyTaskResponse, status_code=201)
def create_daily_task(
    plan_id: str,
    task_in: DailyTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new task for a daily plan."""
    service = DailyPlanService(db)
    plan = service.get_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Daily plan not found")
    if str(plan.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to modify this plan")

    task = service.create_task(plan_id, task_in)
    return task


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
    return updated_task


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
    return updated_task
