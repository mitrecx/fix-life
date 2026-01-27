from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional, List
from uuid import UUID

from app.models.daily_plan import DailyTaskPriority, DailyTaskStatus, BusynessLevel
from app.schemas.daily_summary import DailySummaryResponse


class DailyTaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="Task title")
    description: Optional[str] = Field(None, max_length=1000, description="Task description")
    priority: DailyTaskPriority = Field(default=DailyTaskPriority.MEDIUM, description="Task priority")
    status: DailyTaskStatus = Field(default=DailyTaskStatus.TODO, description="Task status")
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
    estimated_minutes: Optional[int] = Field(None, gt=0)
    actual_minutes: Optional[int] = Field(None, ge=0)
    time_slot: Optional[str] = Field(None, max_length=50)

    class Config:
        from_attributes = True


class DailyTaskResponse(DailyTaskBase):
    id: UUID
    daily_plan_id: UUID
    actual_minutes: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DailyPlanBase(BaseModel):
    plan_date: date = Field(..., description="Date of the plan")
    title: Optional[str] = Field(None, max_length=200, description="Plan title")
    busyness_level: Optional[BusynessLevel] = Field(None, description="Daily busyness level")
    notes: Optional[str] = Field(None, max_length=2000, description="Additional notes")

    class Config:
        from_attributes = True


class DailyPlanCreate(DailyPlanBase):
    monthly_plan_id: Optional[UUID] = Field(None, description="Associated monthly plan ID")


class DailyPlanUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    busyness_level: Optional[BusynessLevel] = None
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
