from datetime import datetime
from typing import Any, Optional
from uuid import UUID
from pydantic import BaseModel, Field, computed_field, model_validator
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
    daily_progress_day_id: UUID
    daily_plan_id: Optional[UUID] = Field(
        default=None,
        description="Deprecated: use daily_progress_day_id",
    )
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="before")
    @classmethod
    def sync_day_id(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "daily_progress_day_id" not in data and "daily_plan_id" in data:
                data = {**data, "daily_progress_day_id": data["daily_plan_id"]}
            elif "daily_plan_id" not in data and "daily_progress_day_id" in data:
                data = {**data, "daily_plan_id": data["daily_progress_day_id"]}
        return data

    @model_validator(mode="after")
    def ensure_deprecated_day_id(self) -> "DailySummaryResponse":
        day_id = self.daily_progress_day_id or self.daily_plan_id
        if day_id is None:
            raise ValueError("daily_progress_day_id is required")
        return self.model_copy(update={"daily_progress_day_id": day_id, "daily_plan_id": day_id})

    class Config:
        from_attributes = True
