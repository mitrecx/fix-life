from typing import Optional
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.v1.deps import get_db, get_current_user
from app.models.user import User
from app.models.task_context import TaskContext
from app.models.task_priority import TaskPriority
from app.schemas.backlog_task import (
    BacklogTaskCreate,
    BacklogTaskUpdate,
    BacklogTaskResponse,
    BacklogTaskList,
    BacklogTaskSchedule,
)
from app.services.backlog_task_service import BacklogTaskService

router = APIRouter()


@router.get("/", response_model=BacklogTaskList)
def list_backlog_tasks(
    tab: str = Query("active", description="active (pending+scheduled) or done"),
    context: Optional[TaskContext] = Query(None),
    priority: Optional[TaskPriority] = Query(None),
    q: Optional[str] = Query(None, description="Keyword search in title"),
    time_field: Optional[str] = Query(
        None, description="created, scheduled, or completed — used with date_from/date_to"
    ),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if time_field is not None and time_field not in ("created", "scheduled", "completed"):
        raise HTTPException(status_code=422, detail="time_field must be created, scheduled, or completed")

    service = BacklogTaskService(db)
    active_only = tab != "done"
    tasks = service.get_user_tasks(
        str(current_user.id),
        active_only=active_only,
        context=context,
        priority=priority,
        q=q,
        time_field=time_field,  # type: ignore[arg-type]
        date_from=date_from,
        date_to=date_to,
    )
    return BacklogTaskList(tasks=tasks, total=len(tasks))


@router.post("/", response_model=BacklogTaskResponse, status_code=201)
def create_backlog_task(
    task_in: BacklogTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = BacklogTaskService(db)
    return service.create_task(str(current_user.id), task_in)


@router.put("/{task_id}", response_model=BacklogTaskResponse)
def update_backlog_task(
    task_id: str,
    task_in: BacklogTaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = BacklogTaskService(db)
    task = service.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Backlog task not found")
    if str(task.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    updated = service.update_task(task_id, task_in)
    return updated


@router.delete("/{task_id}", status_code=204)
def delete_backlog_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = BacklogTaskService(db)
    task = service.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Backlog task not found")
    if str(task.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    service.delete_task(task_id)
    return None


@router.post("/{task_id}/complete", response_model=BacklogTaskResponse)
def complete_backlog_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = BacklogTaskService(db)
    task = service.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Backlog task not found")
    if str(task.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    completed = service.complete_task(task_id)
    if not completed:
        raise HTTPException(status_code=400, detail="Unable to complete task")
    return completed


@router.post("/{task_id}/schedule", response_model=BacklogTaskResponse)
def schedule_backlog_task(
    task_id: str,
    schedule_in: BacklogTaskSchedule,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = BacklogTaskService(db)
    task = service.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Backlog task not found")
    if str(task.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    scheduled = service.schedule_task(str(current_user.id), task_id, schedule_in)
    if not scheduled:
        raise HTTPException(status_code=400, detail="Unable to schedule task")
    return scheduled


@router.post("/{task_id}/revert", response_model=BacklogTaskResponse)
def revert_backlog_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = BacklogTaskService(db)
    task = service.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Backlog task not found")
    if str(task.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    reverted = service.revert_to_inbox(task_id)
    if not reverted:
        raise HTTPException(status_code=400, detail="Unable to revert task")
    return reverted
