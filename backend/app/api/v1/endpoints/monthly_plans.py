from typing import List
from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.api.v1.deps import get_db, get_current_user
from app.models.user import User
from app.models.monthly_plan import TaskStatus
from app.schemas.monthly_plan import (
    MonthlyPlanCreate,
    MonthlyPlanUpdate,
    MonthlyPlanResponse,
    MonthlyPlanList,
    MonthlyTaskCreate,
    MonthlyTaskUpdate,
    MonthlyTaskResponse,
)
from app.services.monthly_plan_service import MonthlyPlanService

router = APIRouter()


@router.get("/", response_model=MonthlyPlanList)
def get_monthly_plans(
    year: int = Query(None, description="Filter by year"),
    month: int = Query(None, ge=1, le=12, description="Filter by month"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all monthly plans for the current user."""
    service = MonthlyPlanService(db)
    plans = service.get_user_plans(
        user_id=str(current_user.id),
        year=year,
        month=month,
    )
    return MonthlyPlanList(plans=plans, total=len(plans))


@router.post("/", response_model=MonthlyPlanResponse, status_code=201)
def create_monthly_plan(
    plan_in: MonthlyPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new monthly plan."""
    service = MonthlyPlanService(db)
    try:
        plan = service.create_plan(
            user_id=str(current_user.id),
            plan_in=plan_in,
        )
        return plan
    except IntegrityError as e:
        db.rollback()
        if "ix_monthly_plans_user_year_month" in str(e):
            raise HTTPException(
                status_code=400,
                detail=f"该月份 ({plan_in.year}年{plan_in.month}月) 的计划已存在，请选择其他月份或编辑现有计划。"
            )
        raise HTTPException(
            status_code=400,
            detail="创建失败，请检查输入数据。"
        )


@router.get("/{plan_id}", response_model=MonthlyPlanResponse)
def get_monthly_plan(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific monthly plan by ID."""
    service = MonthlyPlanService(db)
    plan = service.get_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Monthly plan not found")
    if str(plan.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to access this plan")
    return plan


@router.put("/{plan_id}", response_model=MonthlyPlanResponse)
def update_monthly_plan(
    plan_id: str,
    plan_in: MonthlyPlanUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a monthly plan."""
    service = MonthlyPlanService(db)
    plan = service.get_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Monthly plan not found")
    if str(plan.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to update this plan")

    updated_plan = service.update_plan(plan_id, plan_in)
    return updated_plan


@router.delete("/{plan_id}", status_code=204)
def delete_monthly_plan(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a monthly plan."""
    service = MonthlyPlanService(db)
    plan = service.get_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Monthly plan not found")
    if str(plan.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to delete this plan")

    service.delete_plan(plan_id)
    return None


# ===== Task Endpoints =====

@router.get("/{plan_id}/tasks", response_model=List[MonthlyTaskResponse])
def get_monthly_tasks(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all tasks for a monthly plan."""
    service = MonthlyPlanService(db)
    plan = service.get_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Monthly plan not found")
    if str(plan.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to access this plan")

    tasks = service.get_plan_tasks(plan_id)
    return tasks


@router.post("/{plan_id}/tasks", response_model=MonthlyTaskResponse, status_code=201)
def create_monthly_task(
    plan_id: str,
    task_in: MonthlyTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new task for a monthly plan."""
    service = MonthlyPlanService(db)
    plan = service.get_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Monthly plan not found")
    if str(plan.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to modify this plan")

    task = service.create_task(plan_id, task_in)
    return task


@router.put("/tasks/{task_id}", response_model=MonthlyTaskResponse)
def update_monthly_task(
    task_id: str,
    task_in: MonthlyTaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a monthly task."""
    service = MonthlyPlanService(db)
    task = service.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Monthly task not found")

    # Check if user owns the parent plan
    plan = service.get_plan(str(task.monthly_plan_id))
    if not plan or str(plan.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to update this task")

    updated_task = service.update_task(task_id, task_in)
    return updated_task


@router.delete("/tasks/{task_id}", status_code=204)
def delete_monthly_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a monthly task."""
    service = MonthlyPlanService(db)
    task = service.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Monthly task not found")

    # Check if user owns the parent plan
    plan = service.get_plan(str(task.monthly_plan_id))
    if not plan or str(plan.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to delete this task")

    service.delete_task(task_id)
    return None


@router.patch("/tasks/{task_id}/status", response_model=MonthlyTaskResponse)
def update_task_status(
    task_id: str,
    status: TaskStatus = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update the status of a monthly task."""
    service = MonthlyPlanService(db)
    task = service.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Monthly task not found")

    # Check if user owns the parent plan
    plan = service.get_plan(str(task.monthly_plan_id))
    if not plan or str(plan.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to update this task")

    updated_task = service.update_task_status(task_id, status)
    return updated_task
