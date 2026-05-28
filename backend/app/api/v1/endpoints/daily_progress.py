from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Body, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.api.v1.deps import get_db, get_current_user
from app.models.user import User
from app.models.daily_progress import DailyProgressEntryStatus
from app.models.task_context import TaskContext
from app.schemas.daily_progress import (
    DailyProgressDayCreate,
    DailyProgressDayUpdate,
    DailyProgressDayResponse,
    DailyProgressDayList,
    DailyProgressDayByDateResponse,
    DailyProgressEntryCreate,
    DailyProgressEntryUpdate,
    DailyProgressEntryResponse,
    DailyProgressEntryAdd,
)
from app.services.daily_progress_service import DailyProgressService
from app.services.backlog_task_service import BacklogTaskService

router = APIRouter()


@router.get("/", response_model=DailyProgressDayList)
def get_daily_progress_days(
    start_date: date = Query(None, description="Filter by start date"),
    end_date: date = Query(None, description="Filter by end date"),
    context: Optional[TaskContext] = Query(None, description="Filter entries by context"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all daily progress days for the current user."""
    service = DailyProgressService(db)
    days = service.get_user_days(
        user_id=str(current_user.id),
        start_date=start_date,
        end_date=end_date,
    )
    day_responses = [service.to_day_response(day, context=context) for day in days]
    if context is not None:
        day_responses = [day for day in day_responses if day.total_tasks > 0]
    return DailyProgressDayList(
        daily_progress_days=day_responses,
        total=len(day_responses),
    )


@router.get("/by-date/{progress_date}", response_model=DailyProgressDayByDateResponse)
def get_daily_progress_by_date(
    progress_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lightweight lookup: daily progress for this user on progress_date (no nested entries)."""
    service = DailyProgressService(db)
    day = service.get_day_head_by_date(str(current_user.id), progress_date)
    if not day:
        raise HTTPException(status_code=404, detail="No daily progress for this date")
    return day


@router.post("/", response_model=DailyProgressDayResponse)
def create_daily_progress_day(
    day_in: DailyProgressDayCreate,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create daily progress for a date, or merge into existing progress for the same date."""
    service = DailyProgressService(db)
    day, created = service.create_or_merge_day(str(current_user.id), day_in)
    response.status_code = 201 if created else 200
    return service.to_day_response(day)


@router.get("/{daily_progress_day_id}", response_model=DailyProgressDayResponse)
def get_daily_progress_day(
    daily_progress_day_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get daily progress by ID."""
    service = DailyProgressService(db)
    day = service.get_day(daily_progress_day_id)
    if not day:
        raise HTTPException(status_code=404, detail="Daily progress not found")
    if str(day.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to access this daily progress")
    return service.to_day_response(day)


@router.put("/{daily_progress_day_id}", response_model=DailyProgressDayResponse)
def update_daily_progress_day(
    daily_progress_day_id: str,
    day_in: DailyProgressDayUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update daily progress."""
    service = DailyProgressService(db)
    day = service.get_day(daily_progress_day_id)
    if not day:
        raise HTTPException(status_code=404, detail="Daily progress not found")
    if str(day.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to update this daily progress")

    updated_day = service.update_day(daily_progress_day_id, day_in)
    return service.to_day_response(updated_day)


@router.delete("/{daily_progress_day_id}", status_code=204)
def delete_daily_progress_day(
    daily_progress_day_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete daily progress for a date."""
    service = DailyProgressService(db)
    day = service.get_day(daily_progress_day_id)
    if not day:
        raise HTTPException(status_code=404, detail="Daily progress not found")
    if str(day.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to delete this daily progress")

    service.delete_day(daily_progress_day_id)
    return None


@router.get("/{daily_progress_day_id}/entries", response_model=List[DailyProgressEntryResponse])
def get_daily_progress_entries(
    daily_progress_day_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all progress entries for a daily progress day."""
    service = DailyProgressService(db)
    day = service.get_day(daily_progress_day_id)
    if not day:
        raise HTTPException(status_code=404, detail="Daily progress not found")
    if str(day.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to access this daily progress")

    entries = service.get_day_entries(daily_progress_day_id)
    return [service.to_entry_response(entry) for entry in entries]


@router.post("/{daily_progress_day_id}/entries", response_model=DailyProgressEntryResponse, status_code=201)
def create_daily_progress_entry(
    daily_progress_day_id: str,
    entry_in: DailyProgressEntryAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Link an existing backlog task to this day, or create a new backlog task and link it."""
    daily_service = DailyProgressService(db)
    day = daily_service.get_day(daily_progress_day_id)
    if not day:
        raise HTTPException(status_code=404, detail="Daily progress not found")
    if str(day.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to modify this daily progress")

    backlog_service = BacklogTaskService(db)
    entry = backlog_service.add_to_daily_progress_day(str(current_user.id), daily_progress_day_id, entry_in)
    if not entry:
        raise HTTPException(status_code=400, detail="Unable to link task to daily progress")
    return daily_service.to_entry_response(entry)


@router.put("/entries/{entry_id}", response_model=DailyProgressEntryResponse)
def update_daily_progress_entry(
    entry_id: str,
    entry_in: DailyProgressEntryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a daily progress entry."""
    service = DailyProgressService(db)
    entry = service.get_entry(entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Daily progress entry not found")

    day = service.get_day(str(entry.daily_progress_day_id))
    if not day or str(day.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to update this entry")

    updated_entry = service.update_entry(entry_id, entry_in)
    if updated_entry and entry_in.status is not None:
        BacklogTaskService(db).sync_from_daily_task(
            str(updated_entry.id),
            is_done=updated_entry.status == DailyProgressEntryStatus.DONE,
        )
    return service.to_entry_response(updated_entry) if updated_entry else updated_entry


@router.delete("/entries/{entry_id}", status_code=204)
def delete_daily_progress_entry(
    entry_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a daily progress entry."""
    service = DailyProgressService(db)
    entry = service.get_entry(entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Daily progress entry not found")

    day = service.get_day(str(entry.daily_progress_day_id))
    if not day or str(day.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to delete this entry")

    service.delete_entry(entry_id)
    return None


@router.patch("/entries/{entry_id}/status", response_model=DailyProgressEntryResponse)
def update_entry_status(
    entry_id: str,
    status: DailyProgressEntryStatus = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update the status of a daily progress entry."""
    service = DailyProgressService(db)
    entry = service.get_entry(entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Daily progress entry not found")

    day = service.get_day(str(entry.daily_progress_day_id))
    if not day or str(day.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to update this entry")

    updated_entry = service.update_entry_status(entry_id, status)
    if updated_entry:
        BacklogTaskService(db).sync_from_daily_task(
            str(updated_entry.id),
            is_done=updated_entry.status == DailyProgressEntryStatus.DONE,
        )
    return service.to_entry_response(updated_entry) if updated_entry else updated_entry
