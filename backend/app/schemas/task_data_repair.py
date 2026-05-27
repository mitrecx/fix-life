from datetime import date
from typing import Any, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.models.daily_plan import DailyTaskStatus


class OrphanDailyItem(BaseModel):
    daily_task_id: UUID
    daily_progress_day_id: UUID
    daily_plan_id: Optional[UUID] = Field(
        default=None,
        description="Deprecated: use daily_progress_day_id",
    )
    plan_date: date
    title: str
    daily_status: DailyTaskStatus
    suggested_action: str

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
    def ensure_deprecated_day_id(self) -> "OrphanDailyItem":
        day_id = self.daily_progress_day_id or self.daily_plan_id
        return self.model_copy(update={"daily_progress_day_id": day_id, "daily_plan_id": day_id})


class DuplicateBacklogGroup(BaseModel):
    normalized_title: str
    plan_date: date
    backlog_ids: List[UUID]
    suggested_keep_id: UUID


class FuzzyDuplicatePair(BaseModel):
    backlog_id_a: UUID
    backlog_id_b: UUID
    title: str
    days_apart: int


class DataRepairPreview(BaseModel):
    orphan_daily_count: int
    orphan_samples: List[OrphanDailyItem] = Field(default_factory=list)
    duplicate_groups: List[DuplicateBacklogGroup] = Field(default_factory=list)
    fuzzy_duplicate_pairs: List[FuzzyDuplicatePair] = Field(default_factory=list)
    would_link_existing: int = 0
    would_create_backlog: int = 0
    would_merge_backlogs: int = 0
    would_delete_duplicate_dailies: int = 0
    would_backfill_progress_snapshots: int = 0


class DataRepairRunRequest(BaseModel):
    dry_run: bool = False


class DataRepairRunResult(BaseModel):
    dry_run: bool
    linked_existing: int = 0
    created_backlog: int = 0
    merged_backlogs: int = 0
    deleted_duplicate_dailies: int = 0
    backfilled_progress_snapshots: int = 0
    skipped: int = 0


class MergeBacklogRequest(BaseModel):
    keeper_id: UUID
    merge_id: UUID
