from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional, List
from uuid import UUID

from app.models.yearly_goal import GoalStatus, GoalCategory


class MonthlyMilestoneBase(BaseModel):
    month: int = Field(..., ge=1, le=12, description="Month number (1-12)")
    target_value: float = Field(..., gt=0, description="Target value for the month")
    achieved_value: float = Field(0, ge=0, description="Actually achieved value")
    note: Optional[str] = Field(None, max_length=500, description="Optional note for the milestone")

    class Config:
        from_attributes = True


class MonthlyMilestoneCreate(MonthlyMilestoneBase):
    pass


class MonthlyMilestoneUpdate(BaseModel):
    target_value: Optional[float] = Field(None, gt=0)
    achieved_value: Optional[float] = Field(None, ge=0)
    note: Optional[str] = Field(None, max_length=500)

    class Config:
        from_attributes = True


class YearlyGoalBase(BaseModel):
    year: int = Field(..., ge=2020, le=2100, description="Year of the goal")
    title: str = Field(..., min_length=1, max_length=200, description="Goal title")
    description: Optional[str] = Field(None, max_length=1000, description="Detailed description")
    category: GoalCategory = Field(..., description="Goal category")
    color: str = Field(default="#3B82F6", pattern=r"^#[0-9A-Fa-f]{6}$", description="Hex color code")
    target_value: float = Field(..., gt=0, description="Target value to achieve")
    unit: Optional[str] = Field(None, max_length=20, description="Unit of measurement (e.g., 'books', 'hours')")
    start_date: Optional[date] = Field(None, description="Goal start date")
    end_date: Optional[date] = Field(None, description="Goal end date")


class YearlyGoalCreate(YearlyGoalBase):
    auto_generate_milestones: bool = Field(
        default=True,
        description="Automatically generate monthly milestones"
    )


class YearlyGoalUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    target_value: Optional[float] = Field(None, gt=0)
    status: Optional[GoalStatus] = None
    end_date: Optional[date] = None


class YearlyGoalResponse(YearlyGoalBase):
    id: UUID
    user_id: UUID
    current_value: float
    status: GoalStatus
    completion_rate: float
    milestones: List[MonthlyMilestoneBase] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class YearlyGoalList(BaseModel):
    goals: List[YearlyGoalResponse]
    total: int


class ProgressUpdate(BaseModel):
    progress: float = Field(..., ge=0, description="Progress value to add")
    month: Optional[int] = Field(None, ge=1, le=12, description="Month to update milestone")
    note: Optional[str] = Field(None, max_length=500, description="Note for the milestone")
