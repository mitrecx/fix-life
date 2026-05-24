from datetime import date
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.daily_plan import DailyTaskStatus


class OrphanDailyItem(BaseModel):
    daily_task_id: UUID
    daily_plan_id: UUID
    plan_date: date
    title: str
    daily_status: DailyTaskStatus
    suggested_action: str


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
