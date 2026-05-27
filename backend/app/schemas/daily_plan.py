from pydantic import BaseModel, Field, model_validator
from datetime import date, datetime
from typing import Any, Optional, List
from uuid import UUID

from app.models.daily_plan import DailyTaskPriority, DailyTaskStatus
from app.models.task_context import TaskContext
from app.schemas.daily_summary import DailySummaryResponse


def _mirror_daily_progress_day_id(data: Any) -> Any:
    if isinstance(data, dict):
        if "daily_progress_day_id" not in data and "daily_plan_id" in data:
            data = {**data, "daily_progress_day_id": data["daily_plan_id"]}
        elif "daily_plan_id" not in data and "daily_progress_day_id" in data:
            data = {**data, "daily_plan_id": data["daily_progress_day_id"]}
    return data


def _mirror_daily_progress_entries(data: Any) -> Any:
    if isinstance(data, dict):
        if "daily_progress_entries" not in data and "daily_tasks" in data:
            data = {**data, "daily_progress_entries": data["daily_tasks"]}
        elif "daily_tasks" not in data and "daily_progress_entries" in data:
            data = {**data, "daily_tasks": data["daily_progress_entries"]}
    return data


class DailyTaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="Task title")
    description: Optional[str] = Field(None, max_length=1000, description="Task description")
    priority: DailyTaskPriority = Field(default=DailyTaskPriority.MEDIUM, description="Task priority")
    status: DailyTaskStatus = Field(default=DailyTaskStatus.TODO, description="Task status")
    context: TaskContext = Field(default=TaskContext.LEARNING, description="Task context (work, learning, life)")
    estimated_minutes: Optional[int] = Field(None, gt=0, description="Estimated minutes to complete")
    time_slot: Optional[str] = Field(None, max_length=50, description="Time slot (e.g., morning, afternoon)")

    class Config:
        from_attributes = True


class DailyTaskCreate(DailyTaskBase):
    pass


class DailyTaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    priority: Optional[DailyTaskPriority] = None
    status: Optional[DailyTaskStatus] = None
    context: Optional[TaskContext] = None
    estimated_minutes: Optional[int] = Field(None, gt=0)
    actual_minutes: Optional[int] = Field(None, ge=0)
    time_slot: Optional[str] = Field(None, max_length=50)

    class Config:
        from_attributes = True


class DailyTaskResponse(DailyTaskBase):
    id: UUID
    daily_progress_day_id: UUID
    daily_plan_id: Optional[UUID] = Field(
        default=None,
        description="Deprecated: use daily_progress_day_id",
    )
    backlog_task_id: Optional[UUID] = None
    actual_minutes: int
    progress_after: Optional[int] = Field(None, ge=0, le=100)
    progress_delta: Optional[int] = Field(None, ge=0, le=100)
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="before")
    @classmethod
    def sync_day_id(cls, data: Any) -> Any:
        return _mirror_daily_progress_day_id(data)

    @model_validator(mode="after")
    def ensure_deprecated_day_id(self) -> "DailyTaskResponse":
        day_id = self.daily_progress_day_id or self.daily_plan_id
        if day_id is None:
            raise ValueError("daily_progress_day_id is required")
        return self.model_copy(update={"daily_progress_day_id": day_id, "daily_plan_id": day_id})

    class Config:
        from_attributes = True


class DailyPlanTaskAdd(BaseModel):
    """Add a backlog task to a daily plan (link existing or create new backlog)."""

    backlog_task_id: Optional[UUID] = None
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    priority: DailyTaskPriority = Field(default=DailyTaskPriority.MEDIUM)
    status: DailyTaskStatus = Field(default=DailyTaskStatus.TODO)
    context: TaskContext = Field(default=TaskContext.LEARNING)
    estimated_minutes: Optional[int] = Field(None, gt=0)
    time_slot: Optional[str] = Field(None, max_length=50)

    @model_validator(mode="after")
    def require_backlog_or_title(self):
        if self.backlog_task_id is None and not (self.title and self.title.strip()):
            raise ValueError("backlog_task_id or title is required")
        return self


class DailyPlanBase(BaseModel):
    plan_date: date = Field(..., description="Date of the plan")
    title: Optional[str] = Field(None, max_length=200, description="Plan title")
    notes: Optional[str] = Field(None, max_length=2000, description="Additional notes")

    class Config:
        from_attributes = True


class DailyPlanCreate(DailyPlanBase):
    monthly_plan_id: Optional[UUID] = Field(None, description="Associated monthly plan ID")


class DailyPlanUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = Field(None, max_length=2000)

    class Config:
        from_attributes = True


class DailyPlanResponse(DailyPlanBase):
    id: UUID
    user_id: UUID
    monthly_plan_id: Optional[UUID]
    total_tasks: int
    completed_tasks: int
    completion_rate: float
    daily_progress_entries: List[DailyTaskResponse] = []
    daily_tasks: List[DailyTaskResponse] = Field(
        default_factory=list,
        description="Deprecated: use daily_progress_entries",
    )
    daily_summary: Optional[DailySummaryResponse] = None
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="before")
    @classmethod
    def sync_entries(cls, data: Any) -> Any:
        return _mirror_daily_progress_entries(data)

    @model_validator(mode="after")
    def ensure_deprecated_entries(self) -> "DailyPlanResponse":
        entries = self.daily_progress_entries or self.daily_tasks
        return self.model_copy(update={"daily_progress_entries": entries, "daily_tasks": entries})

    class Config:
        from_attributes = True


class DailyPlanList(BaseModel):
    plans: List[DailyPlanResponse]
    total: int


class DailyPlanByDateResponse(BaseModel):
    """Lightweight plan row for by-date lookup (no nested tasks)."""

    id: UUID
    user_id: UUID
    plan_date: date
    title: Optional[str]
    notes: Optional[str]
    monthly_plan_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
