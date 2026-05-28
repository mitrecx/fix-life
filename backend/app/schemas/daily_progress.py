"""Daily progress (每日进度) API schemas."""

from pydantic import BaseModel, Field, model_validator
from datetime import date, datetime
from typing import Optional, List
from uuid import UUID

from app.models.daily_progress import DailyProgressEntryPriority, DailyProgressEntryStatus
from app.models.task_context import TaskContext
from app.schemas.daily_summary import DailySummaryResponse


class DailyProgressEntryBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="Task title")
    description: Optional[str] = Field(None, max_length=1000, description="Task description")
    priority: DailyProgressEntryPriority = Field(
        default=DailyProgressEntryPriority.MEDIUM, description="Task priority"
    )
    status: DailyProgressEntryStatus = Field(
        default=DailyProgressEntryStatus.TODO, description="Task status"
    )
    context: TaskContext = Field(
        default=TaskContext.LEARNING, description="Task context (work, learning, life)"
    )
    estimated_minutes: Optional[int] = Field(None, gt=0, description="Estimated minutes to complete")
    time_slot: Optional[str] = Field(None, max_length=50, description="Time slot (e.g., morning, afternoon)")

    class Config:
        from_attributes = True


class DailyProgressEntryCreate(DailyProgressEntryBase):
    pass


class DailyProgressEntryUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    priority: Optional[DailyProgressEntryPriority] = None
    status: Optional[DailyProgressEntryStatus] = None
    context: Optional[TaskContext] = None
    estimated_minutes: Optional[int] = Field(None, gt=0)
    actual_minutes: Optional[int] = Field(None, ge=0)
    time_slot: Optional[str] = Field(None, max_length=50)

    class Config:
        from_attributes = True


class DailyProgressEntryResponse(DailyProgressEntryBase):
    id: UUID
    daily_progress_day_id: UUID
    backlog_task_id: Optional[UUID] = None
    actual_minutes: int
    progress_after: Optional[int] = Field(None, ge=0, le=100)
    progress_delta: Optional[int] = Field(None, ge=0, le=100)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DailyProgressEntryAdd(BaseModel):
    """Add a backlog task to a daily progress day (link existing or create new backlog)."""

    backlog_task_id: Optional[UUID] = None
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    priority: DailyProgressEntryPriority = Field(default=DailyProgressEntryPriority.MEDIUM)
    status: DailyProgressEntryStatus = Field(default=DailyProgressEntryStatus.TODO)
    context: TaskContext = Field(default=TaskContext.LEARNING)
    estimated_minutes: Optional[int] = Field(None, gt=0)
    time_slot: Optional[str] = Field(None, max_length=50)

    @model_validator(mode="after")
    def require_backlog_or_title(self):
        if self.backlog_task_id is None and not (self.title and self.title.strip()):
            raise ValueError("backlog_task_id or title is required")
        return self


class DailyProgressDayBase(BaseModel):
    progress_date: date = Field(..., description="Date of the daily progress")
    title: Optional[str] = Field(None, max_length=200, description="Day title")
    notes: Optional[str] = Field(None, max_length=2000, description="Additional notes")

    class Config:
        from_attributes = True


class DailyProgressDayCreate(DailyProgressDayBase):
    monthly_plan_id: Optional[UUID] = Field(None, description="Associated monthly plan ID")


class DailyProgressDayUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = Field(None, max_length=2000)

    class Config:
        from_attributes = True


class DailyProgressDayResponse(DailyProgressDayBase):
    id: UUID
    user_id: UUID
    monthly_plan_id: Optional[UUID]
    total_tasks: int
    completed_tasks: int
    completion_rate: float
    daily_progress_entries: List[DailyProgressEntryResponse] = Field(default_factory=list)
    daily_summary: Optional[DailySummaryResponse] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DailyProgressDayList(BaseModel):
    daily_progress_days: List[DailyProgressDayResponse]
    total: int


class DailyProgressDayByDateResponse(BaseModel):
    """Lightweight day row for by-date lookup (no nested entries)."""

    id: UUID
    user_id: UUID
    progress_date: date
    title: Optional[str]
    notes: Optional[str]
    monthly_plan_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
