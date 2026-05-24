from pydantic import BaseModel, Field, model_validator
from datetime import date, datetime
from typing import Optional, List
from uuid import UUID

from app.models.daily_plan import DailyTaskPriority, DailyTaskStatus
from app.models.task_context import TaskContext
from app.schemas.daily_summary import DailySummaryResponse


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
    daily_plan_id: UUID
    backlog_task_id: Optional[UUID] = None
    actual_minutes: int
    created_at: datetime
    updated_at: datetime

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
    daily_tasks: List[DailyTaskResponse] = []
    daily_summary: Optional[DailySummaryResponse] = None
    created_at: datetime
    updated_at: datetime

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
