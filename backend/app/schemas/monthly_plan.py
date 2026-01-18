from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional, List
from uuid import UUID

from app.models.monthly_plan import TaskPriority, TaskStatus


class MonthlyTaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="Task title")
    description: Optional[str] = Field(None, max_length=1000, description="Task description")
    priority: TaskPriority = Field(default=TaskPriority.MEDIUM, description="Task priority")
    status: TaskStatus = Field(default=TaskStatus.TODO, description="Task status")
    due_date: Optional[date] = Field(None, description="Task due date")
    estimated_hours: Optional[float] = Field(None, gt=0, description="Estimated hours to complete")

    class Config:
        from_attributes = True


class MonthlyTaskCreate(MonthlyTaskBase):
    pass


class MonthlyTaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
    due_date: Optional[date] = None
    estimated_hours: Optional[float] = Field(None, gt=0)
    actual_hours: Optional[float] = Field(None, ge=0)

    class Config:
        from_attributes = True


class MonthlyTaskResponse(MonthlyTaskBase):
    id: UUID
    monthly_plan_id: UUID
    actual_hours: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MonthlyPlanBase(BaseModel):
    year: int = Field(..., ge=2020, le=2100, description="Year of the plan")
    month: int = Field(..., ge=1, le=12, description="Month of the plan")
    title: Optional[str] = Field(None, max_length=200, description="Plan title")
    focus_areas: Optional[List[str]] = Field(default_factory=list, description="List of focus areas")
    notes: Optional[str] = Field(None, max_length=2000, description="Additional notes")

    class Config:
        from_attributes = True


class MonthlyPlanCreate(MonthlyPlanBase):
    yearly_goal_id: Optional[UUID] = Field(None, description="Associated yearly goal ID")


class MonthlyPlanUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    focus_areas: Optional[List[str]] = None
    notes: Optional[str] = Field(None, max_length=2000)

    class Config:
        from_attributes = True


class MonthlyPlanResponse(MonthlyPlanBase):
    id: UUID
    user_id: UUID
    yearly_goal_id: Optional[UUID]
    total_tasks: int
    completed_tasks: int
    completion_rate: float
    monthly_tasks: List[MonthlyTaskResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MonthlyPlanList(BaseModel):
    plans: List[MonthlyPlanResponse]
    total: int
