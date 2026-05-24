from pydantic import BaseModel, Field, field_validator, model_validator
from datetime import date, datetime
from typing import Optional, List
from uuid import UUID

from app.models.backlog_task import BacklogTaskStatus
from app.models.daily_plan import DailyTaskStatus
from app.models.task_context import TaskContext
from app.models.task_priority import TaskPriority

_FORM_PROGRESS = {0, 25, 50, 75, 100}


def progress_to_status(progress: int) -> BacklogTaskStatus:
    if progress == 0:
        return BacklogTaskStatus.PENDING
    if progress == 100:
        return BacklogTaskStatus.DONE
    return BacklogTaskStatus.IN_PROGRESS


class BacklogTaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    context: TaskContext = Field(default=TaskContext.LEARNING)
    priority: TaskPriority = Field(default=TaskPriority.MEDIUM)

    class Config:
        from_attributes = True


class BacklogTaskCreate(BacklogTaskBase):
    progress: int = Field(default=0, ge=0, le=100)

    @field_validator("progress")
    @classmethod
    def validate_progress(cls, value: int) -> int:
        if value not in _FORM_PROGRESS and value not in (0, 100):
            # Allow any 1-99 for API flexibility; form uses presets
            pass
        return value


class BacklogTaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    context: Optional[TaskContext] = None
    priority: Optional[TaskPriority] = None
    progress: Optional[int] = Field(None, ge=0, le=100)

    class Config:
        from_attributes = True


class BacklogTaskSchedule(BaseModel):
    plan_date: date = Field(..., description="Date to schedule the task onto")


class BacklogOccurrence(BaseModel):
    daily_task_id: UUID
    daily_plan_id: Optional[UUID] = None
    plan_date: date
    daily_status: Optional[DailyTaskStatus] = None
    daily_title: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class BacklogTaskResponse(BacklogTaskBase):
    id: UUID
    user_id: UUID
    status: BacklogTaskStatus
    progress: int = 0
    origin: str = "inbox"
    scheduled_date: Optional[date] = None
    daily_task_id: Optional[UUID] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    occurrence_count: int = 0
    is_scheduled: bool = False
    last_plan_date: Optional[date] = None
    linked_dates: List[date] = []
    possible_duplicate_count: int = 0

    class Config:
        from_attributes = True


class BacklogTaskDetail(BacklogTaskResponse):
    occurrences: List[BacklogOccurrence] = []


class BacklogTaskList(BaseModel):
    tasks: List[BacklogTaskResponse]
    total: int
