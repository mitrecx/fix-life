from pydantic import BaseModel, Field, field_validator
from datetime import date, datetime
from typing import Optional, List
from uuid import UUID

from app.models.backlog_task import BacklogTaskStatus
from app.models.task_context import TaskContext
from app.models.task_priority import TaskPriority

_FORM_STATUSES = {BacklogTaskStatus.PENDING, BacklogTaskStatus.DONE}


def _validate_form_status(status: BacklogTaskStatus) -> BacklogTaskStatus:
    if status not in _FORM_STATUSES:
        raise ValueError("status must be pending or done")
    return status


class BacklogTaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    context: TaskContext = Field(default=TaskContext.LEARNING)
    priority: TaskPriority = Field(default=TaskPriority.MEDIUM)

    class Config:
        from_attributes = True


class BacklogTaskCreate(BacklogTaskBase):
    status: BacklogTaskStatus = Field(default=BacklogTaskStatus.PENDING)

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: BacklogTaskStatus) -> BacklogTaskStatus:
        return _validate_form_status(value)


class BacklogTaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    context: Optional[TaskContext] = None
    priority: Optional[TaskPriority] = None
    status: Optional[BacklogTaskStatus] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: Optional[BacklogTaskStatus]) -> Optional[BacklogTaskStatus]:
        if value is None:
            return value
        return _validate_form_status(value)

    class Config:
        from_attributes = True


class BacklogTaskSchedule(BaseModel):
    plan_date: date = Field(..., description="Date to schedule the task onto")


class BacklogTaskResponse(BacklogTaskBase):
    id: UUID
    user_id: UUID
    status: BacklogTaskStatus
    scheduled_date: Optional[date]
    daily_task_id: Optional[UUID]
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BacklogTaskList(BaseModel):
    tasks: List[BacklogTaskResponse]
    total: int
