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
    BacklogTaskDetail,
    BacklogTaskList,
    BacklogTaskSchedule,
)
from app.schemas.task_data_repair import (
    DataRepairPreview,
    DataRepairRunRequest,
    DataRepairRunResult,
    MergeBacklogRequest,
)
from app.services.backlog_task_service import BacklogTaskService
from app.services.task_data_repair_service import TaskDataRepairService

router = APIRouter()

_VALID_TABS = {"pending", "in_progress", "done", "active"}


@router.get("/", response_model=BacklogTaskList)
def list_backlog_tasks(
    tab: str = Query("pending", description="pending, in_progress, done, or active (legacy)"),
    context: Optional[TaskContext] = Query(None),
    priority: Optional[TaskPriority] = Query(None),
    q: Optional[str] = Query(None, description="Keyword search in title"),
    time_field: Optional[str] = Query(
        None, description="created, scheduled, or completed — used with date_from/date_to"
    ),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    limit: Optional[int] = Query(None, ge=1, le=100, description="Page size; omit to return all matches"),
    offset: int = Query(0, ge=0, description="Number of rows to skip after sorting"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if tab not in _VALID_TABS:
        raise HTTPException(
            status_code=422,
            detail="tab must be pending, in_progress, done, or active",
        )
    if time_field is not None and time_field not in ("created", "scheduled", "completed"):
        raise HTTPException(status_code=422, detail="time_field must be created, scheduled, or completed")

    service = BacklogTaskService(db)
    tasks, total = service.get_user_tasks(
        str(current_user.id),
        tab=tab,  # type: ignore[arg-type]
        context=context,
        priority=priority,
        q=q,
        time_field=time_field,  # type: ignore[arg-type]
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        offset=offset,
    )
    repair_service = TaskDataRepairService(db)
    dup_counts = repair_service.compute_fuzzy_duplicate_counts(
        str(current_user.id), [str(t.id) for t in tasks]
    )
    return BacklogTaskList(
        tasks=[
            service.to_response(t, possible_duplicate_count=dup_counts.get(str(t.id), 0))
            for t in tasks
        ],
        total=total,
    )


@router.get("/data-repair/preview", response_model=DataRepairPreview)
def preview_data_repair(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return TaskDataRepairService(db).preview(str(current_user.id))


@router.post("/data-repair/run", response_model=DataRepairRunResult)
def run_data_repair(
    body: DataRepairRunRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return TaskDataRepairService(db).run(str(current_user.id), dry_run=body.dry_run)


@router.post("/data-repair/merge", response_model=BacklogTaskResponse)
def merge_backlog_tasks(
    body: MergeBacklogRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repair_service = TaskDataRepairService(db)
    ok = repair_service.merge_backlogs(
        str(current_user.id), str(body.keeper_id), str(body.merge_id)
    )
    if not ok:
        raise HTTPException(status_code=400, detail="Unable to merge backlog tasks")
    db.commit()
    service = BacklogTaskService(db)
    task = service.get_task(str(body.keeper_id))
    if not task:
        raise HTTPException(status_code=404, detail="Backlog task not found")
    dup_counts = repair_service.compute_fuzzy_duplicate_counts(str(current_user.id), [str(task.id)])
    return service.to_response(task, possible_duplicate_count=dup_counts.get(str(task.id), 0))


@router.get("/{task_id}", response_model=BacklogTaskDetail)
def get_backlog_task(
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
    return service.to_detail(task)


@router.post("/", response_model=BacklogTaskResponse, status_code=201)
def create_backlog_task(
    task_in: BacklogTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = BacklogTaskService(db)
    task = service.create_task(str(current_user.id), task_in)
    return service.to_response(task)


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
    if not updated:
        raise HTTPException(status_code=404, detail="Backlog task not found")
    return service.to_response(updated)


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
    return service.to_response(completed)


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
    return service.to_response(scheduled)


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
    return service.to_response(reverted)
