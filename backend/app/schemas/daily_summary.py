from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, computed_field
from app.models.daily_plan import SummaryType


# Summary Type Labels for frontend
SUMMARY_TYPE_LABELS = {
    SummaryType.DAILY: "日常总结",
    SummaryType.SMALL: "小总结",
    SummaryType.LARGE: "大总结",
}


class DailySummaryBase(BaseModel):
    summary_type: SummaryType = Field(..., description="总结类型")
    content: str = Field(..., min_length=1, max_length=10000, description="总结内容")


class DailySummaryCreate(DailySummaryBase):
    pass


class DailySummaryUpdate(BaseModel):
    summary_type: Optional[SummaryType] = None
    content: Optional[str] = Field(None, min_length=1, max_length=10000)


class DailySummaryResponse(DailySummaryBase):
    id: UUID
    daily_plan_id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
