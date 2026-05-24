from datetime import datetime, time, timedelta
from typing import Dict, List, Optional, Tuple
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.backlog_daily_link import BacklogDailyLink
from app.models.backlog_task import BacklogTask
from app.models.daily_plan import DailyPlan, DailyTask, DailyTaskStatus
from app.models.task_priority import TaskPriority
from app.schemas.task_data_repair import (
    DataRepairPreview,
    DataRepairRunResult,
    DuplicateBacklogGroup,
    FuzzyDuplicatePair,
    OrphanDailyItem,
)
from app.services.backlog_task_service import BacklogTaskService


def _normalize_title(title: str) -> str:
    return title.strip().lower()


class TaskDataRepairService:
    FUZZY_WINDOW_DAYS = 7
    PREVIEW_SAMPLE_LIMIT = 20

    def __init__(self, db: Session):
        self.db = db
        self.backlog_service = BacklogTaskService(db)

    def _orphan_dailies(self, user_id: str) -> List[Tuple[DailyTask, DailyPlan]]:
        return (
            self.db.query(DailyTask, DailyPlan)
            .join(DailyPlan, DailyTask.daily_plan_id == DailyPlan.id)
            .outerjoin(BacklogDailyLink, BacklogDailyLink.daily_task_id == DailyTask.id)
            .filter(DailyPlan.user_id == user_id, BacklogDailyLink.id.is_(None))
            .order_by(DailyPlan.plan_date.desc(), DailyTask.created_at.desc())
            .all()
        )

    @staticmethod
    def _daily_progress(status: DailyTaskStatus) -> int:
        if status == DailyTaskStatus.DONE:
            return 100
        if status == DailyTaskStatus.IN_PROGRESS:
            return 50
        return 0

    def _count_missing_progress_snapshots(self, user_id: str) -> int:
        return (
            self.db.query(BacklogDailyLink)
            .join(BacklogTask, BacklogTask.id == BacklogDailyLink.backlog_task_id)
            .filter(BacklogTask.user_id == user_id, BacklogDailyLink.progress_after.is_(None))
            .count()
        )

    def _find_matching_backlog(
        self, user_id: str, title: str, plan_date
    ) -> Optional[BacklogTask]:
        normalized = _normalize_title(title)
        tasks = (
            self.db.query(BacklogTask)
            .filter(BacklogTask.user_id == user_id)
            .filter(func.lower(func.trim(BacklogTask.title)) == normalized)
            .order_by(BacklogTask.created_at.asc())
            .all()
        )
        for task in tasks:
            if not self.backlog_service.get_link_for_date(str(task.id), plan_date):
                return task
        return None

    def _find_duplicate_groups(self, user_id: str) -> List[DuplicateBacklogGroup]:
        rows = (
            self.db.query(
                func.lower(func.trim(BacklogTask.title)).label("norm_title"),
                BacklogDailyLink.plan_date,
                BacklogTask.id,
                BacklogTask.created_at,
            )
            .join(BacklogDailyLink, BacklogDailyLink.backlog_task_id == BacklogTask.id)
            .filter(BacklogTask.user_id == user_id)
            .all()
        )
        grouped: Dict[tuple, List[Tuple[UUID, datetime]]] = {}
        for norm_title, plan_date, backlog_id, created_at in rows:
            key = (norm_title, plan_date)
            grouped.setdefault(key, []).append((backlog_id, created_at or datetime.utcnow()))

        result: List[DuplicateBacklogGroup] = []
        for (norm_title, plan_date), items in grouped.items():
            unique: Dict[UUID, datetime] = {}
            for backlog_id, created_at in items:
                unique[backlog_id] = min(unique.get(backlog_id, created_at), created_at)
            if len(unique) <= 1:
                continue
            sorted_items = sorted(unique.items(), key=lambda x: x[1])
            result.append(
                DuplicateBacklogGroup(
                    normalized_title=norm_title,
                    plan_date=plan_date,
                    backlog_ids=[item[0] for item in sorted_items],
                    suggested_keep_id=sorted_items[0][0],
                )
            )
        return sorted(result, key=lambda g: (g.plan_date, g.normalized_title), reverse=True)

    def _find_fuzzy_pairs(self, user_id: str) -> List[FuzzyDuplicatePair]:
        tasks = (
            self.db.query(BacklogTask)
            .filter(BacklogTask.user_id == user_id)
            .order_by(BacklogTask.created_at.asc())
            .all()
        )
        by_title: Dict[str, List[BacklogTask]] = {}
        for task in tasks:
            by_title.setdefault(_normalize_title(task.title), []).append(task)

        pairs: List[FuzzyDuplicatePair] = []
        seen: set[tuple] = set()
        window = timedelta(days=self.FUZZY_WINDOW_DAYS)
        for title_tasks in by_title.values():
            if len(title_tasks) < 2:
                continue
            for i, a in enumerate(title_tasks):
                for b in title_tasks[i + 1 :]:
                    if not a.created_at or not b.created_at:
                        continue
                    delta = abs(a.created_at - b.created_at)
                    if delta > window:
                        continue
                    key = tuple(sorted([str(a.id), str(b.id)]))
                    if key in seen:
                        continue
                    seen.add(key)
                    pairs.append(
                        FuzzyDuplicatePair(
                            backlog_id_a=a.id,
                            backlog_id_b=b.id,
                            title=a.title,
                            days_apart=delta.days,
                        )
                    )
        return pairs[:50]

    def compute_fuzzy_duplicate_counts(
        self, user_id: str, task_ids: Optional[List[str]] = None
    ) -> Dict[str, int]:
        tasks = (
            self.db.query(BacklogTask)
            .filter(BacklogTask.user_id == user_id)
            .order_by(BacklogTask.created_at.asc())
            .all()
        )
        id_set = set(task_ids) if task_ids else None
        by_title: Dict[str, List[BacklogTask]] = {}
        for task in tasks:
            by_title.setdefault(_normalize_title(task.title), []).append(task)

        counts: Dict[str, int] = {}
        window = timedelta(days=self.FUZZY_WINDOW_DAYS)
        for task in tasks:
            if id_set is not None and str(task.id) not in id_set:
                continue
            if not task.created_at:
                counts[str(task.id)] = 0
                continue
            total = 0
            for other in by_title.get(_normalize_title(task.title), []):
                if other.id == task.id or not other.created_at:
                    continue
                if abs(other.created_at - task.created_at) <= window:
                    total += 1
            counts[str(task.id)] = total
        return counts

    def preview(self, user_id: str) -> DataRepairPreview:
        orphans = self._orphan_dailies(user_id)
        orphan_samples: List[OrphanDailyItem] = []
        would_link = 0
        would_create = 0

        for daily, plan in orphans:
            match = self._find_matching_backlog(user_id, daily.title, plan.plan_date)
            action = "link_existing" if match else "create_backlog"
            if action == "link_existing":
                would_link += 1
            else:
                would_create += 1
            if len(orphan_samples) < self.PREVIEW_SAMPLE_LIMIT:
                orphan_samples.append(
                    OrphanDailyItem(
                        daily_task_id=daily.id,
                        daily_plan_id=plan.id,
                        plan_date=plan.plan_date,
                        title=daily.title,
                        daily_status=daily.status,
                        suggested_action=action,
                    )
                )

        duplicate_groups = self._find_duplicate_groups(user_id)
        would_merge = sum(len(g.backlog_ids) - 1 for g in duplicate_groups)
        would_delete_dailies = would_merge

        return DataRepairPreview(
            orphan_daily_count=len(orphans),
            orphan_samples=orphan_samples,
            duplicate_groups=duplicate_groups,
            fuzzy_duplicate_pairs=self._find_fuzzy_pairs(user_id),
            would_link_existing=would_link,
            would_create_backlog=would_create,
            would_merge_backlogs=would_merge,
            would_delete_duplicate_dailies=would_delete_dailies,
            would_backfill_progress_snapshots=self._count_missing_progress_snapshots(user_id),
        )

    def _backfill_orphan(self, user_id: str, daily: DailyTask, plan: DailyPlan) -> str:
        existing = self._find_matching_backlog(user_id, daily.title, plan.plan_date)
        if existing:
            self.backlog_service._create_link(existing, str(daily.id), plan.plan_date)
            daily.backlog_task_id = existing.id
            return "linked_existing"

        progress = self._daily_progress(daily.status)
        backlog = BacklogTask(
            title=daily.title.strip(),
            description=daily.description,
            context=daily.context,
            priority=TaskPriority(daily.priority.value),
            user_id=user_id,
            origin="migrated",
            progress=progress,
        )
        self.backlog_service.apply_progress(backlog, progress)
        if progress == 100:
            backlog.completed_at = datetime.combine(plan.plan_date, time(12, 0))
        self.db.add(backlog)
        self.db.flush()
        self.backlog_service._create_link(backlog, str(daily.id), plan.plan_date)
        daily.backlog_task_id = backlog.id
        return "created_backlog"

    def merge_backlogs(self, user_id: str, keeper_id: str, merge_id: str) -> bool:
        if keeper_id == merge_id:
            return False

        keeper = self.backlog_service.get_task(keeper_id)
        merge = self.backlog_service.get_task(merge_id)
        if not keeper or not merge:
            return False
        if str(keeper.user_id) != user_id or str(merge.user_id) != user_id:
            return False

        merge_links = list(self.backlog_service.get_links_for_backlog(merge_id))
        for link in merge_links:
            keeper_link = self.backlog_service.get_link_for_date(keeper_id, link.plan_date)
            daily = self.db.query(DailyTask).filter(DailyTask.id == link.daily_task_id).first()
            if keeper_link:
                if daily:
                    self.db.delete(daily)
                self.db.delete(link)
            else:
                link.backlog_task_id = keeper.id
                if daily:
                    daily.backlog_task_id = keeper.id

        self.db.delete(merge)
        return True

    def run(self, user_id: str, *, dry_run: bool = False) -> DataRepairRunResult:
        preview = self.preview(user_id)
        if dry_run:
            return DataRepairRunResult(
                dry_run=True,
                linked_existing=preview.would_link_existing,
                created_backlog=preview.would_create_backlog,
                merged_backlogs=preview.would_merge_backlogs,
                deleted_duplicate_dailies=preview.would_delete_duplicate_dailies,
                backfilled_progress_snapshots=preview.would_backfill_progress_snapshots,
            )

        result = DataRepairRunResult(dry_run=False)
        orphans = self._orphan_dailies(user_id)
        for daily, plan in orphans:
            action = self._backfill_orphan(user_id, daily, plan)
            if action == "linked_existing":
                result.linked_existing += 1
            else:
                result.created_backlog += 1

        for group in preview.duplicate_groups:
            keeper_id = str(group.suggested_keep_id)
            for backlog_id in group.backlog_ids:
                if str(backlog_id) == keeper_id:
                    continue
                if self.merge_backlogs(user_id, keeper_id, str(backlog_id)):
                    result.merged_backlogs += 1
                    result.deleted_duplicate_dailies += 1

        result.backfilled_progress_snapshots = self.backlog_service.backfill_progress_snapshots(
            user_id
        )

        self.db.commit()
        return result
