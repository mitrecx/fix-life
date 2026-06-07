from datetime import datetime, date
from functools import cmp_to_key
from typing import List, Optional, Literal, Tuple, Dict, Any

from sqlalchemy import cast, Date
from sqlalchemy.orm import Session

from app.models.backlog_daily_link import BacklogDailyLink
from app.models.backlog_task import BacklogTask, BacklogTaskStatus
from app.models.daily_progress import (
    DailyProgressEntry,
    DailyProgressEntryPriority,
    DailyProgressEntryStatus,
)
from app.models.task_context import TaskContext
from app.models.task_priority import TaskPriority
from app.schemas.backlog_task import (
    BacklogTaskCreate,
    BacklogTaskUpdate,
    BacklogTaskSchedule,
    BacklogTaskResponse,
    BacklogTaskDetail,
    BacklogOccurrence,
    progress_to_status,
)
from app.schemas.daily_progress import (
    DailyProgressDayCreate,
    DailyProgressEntryCreate,
    DailyProgressEntryUpdate,
    DailyProgressEntryAdd,
)
from app.services.daily_progress_service import DailyProgressService

BacklogTimeField = Literal["created", "scheduled", "completed"]
BacklogTab = Literal["pending", "in_progress", "done", "active"]

_PRIORITY_RANK = {
    TaskPriority.HIGH: 0,
    TaskPriority.MEDIUM: 1,
    TaskPriority.LOW: 2,
}

_EMPTY_LINK_META: Dict[str, Any] = {
    "occurrence_count": 0,
    "is_scheduled": False,
    "last_plan_date": None,
    "linked_dates": [],
}


class BacklogTaskService:
    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def apply_progress(task: BacklogTask, progress: int) -> None:
        task.progress = progress
        task.status = progress_to_status(progress)
        if progress == 100:
            task.completed_at = datetime.utcnow()
        else:
            task.completed_at = None

    def get_user_tasks(
        self,
        user_id: str,
        *,
        tab: BacklogTab = "pending",
        context: Optional[TaskContext] = None,
        priority: Optional[TaskPriority] = None,
        q: Optional[str] = None,
        time_field: Optional[BacklogTimeField] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        limit: Optional[int] = None,
        offset: int = 0,
    ) -> Tuple[List[BacklogTask], int]:
        query = self.db.query(BacklogTask).filter(BacklogTask.user_id == user_id)

        if tab == "pending":
            query = query.filter(
                BacklogTask.status.in_(
                    (BacklogTaskStatus.PENDING, BacklogTaskStatus.SCHEDULED)
                )
            )
        elif tab == "in_progress":
            query = query.filter(BacklogTask.status == BacklogTaskStatus.IN_PROGRESS)
        elif tab == "done":
            query = query.filter(BacklogTask.status == BacklogTaskStatus.DONE)
        elif tab == "active":
            query = query.filter(BacklogTask.status != BacklogTaskStatus.DONE)

        if context is not None:
            query = query.filter(BacklogTask.context == context)

        if priority is not None:
            query = query.filter(BacklogTask.priority == priority)

        if q:
            query = query.filter(BacklogTask.title.ilike(f"%{q.strip()}%"))

        if time_field and (date_from is not None or date_to is not None):
            if time_field == "created":
                column = BacklogTask.created_at
                if date_from is not None:
                    query = query.filter(cast(column, Date) >= date_from)
                if date_to is not None:
                    query = query.filter(cast(column, Date) <= date_to)
            elif time_field == "scheduled":
                query = query.filter(BacklogTask.scheduled_date.isnot(None))
                if date_from is not None:
                    query = query.filter(BacklogTask.scheduled_date >= date_from)
                if date_to is not None:
                    query = query.filter(BacklogTask.scheduled_date <= date_to)
            elif time_field == "completed":
                query = query.filter(BacklogTask.completed_at.isnot(None))
                if date_from is not None:
                    query = query.filter(cast(BacklogTask.completed_at, Date) >= date_from)
                if date_to is not None:
                    query = query.filter(cast(BacklogTask.completed_at, Date) <= date_to)

        tasks = query.all()
        if not tasks:
            return [], 0

        link_meta = self._batch_link_meta([str(task.id) for task in tasks])
        sorted_tasks = self._sort_tasks_for_tab(tasks, tab, link_meta)
        total = len(sorted_tasks)

        if limit is not None:
            sorted_tasks = sorted_tasks[offset : offset + limit]

        return sorted_tasks, total

    @staticmethod
    def _compare_tasks(
        task_a: BacklogTask,
        meta_a: Dict[str, Any],
        task_b: BacklogTask,
        meta_b: Dict[str, Any],
        tab: BacklogTab,
    ) -> int:
        if tab == "done":
            completed_a = task_a.completed_at or task_a.updated_at
            completed_b = task_b.completed_at or task_b.updated_at
            if completed_a != completed_b:
                return -1 if completed_a > completed_b else 1
            if task_a.created_at != task_b.created_at:
                return -1 if task_a.created_at > task_b.created_at else 1
            return 0

        rank_a = _PRIORITY_RANK.get(task_a.priority, 1)
        rank_b = _PRIORITY_RANK.get(task_b.priority, 1)
        if rank_a != rank_b:
            return rank_a - rank_b

        if tab == "in_progress":
            if task_a.progress != task_b.progress:
                return task_b.progress - task_a.progress
            if task_a.created_at != task_b.created_at:
                return -1 if task_a.created_at > task_b.created_at else 1
            return 0

        if (
            meta_a["is_scheduled"]
            and meta_b["is_scheduled"]
            and meta_a["last_plan_date"]
            and meta_b["last_plan_date"]
            and meta_a["last_plan_date"] != meta_b["last_plan_date"]
        ):
            return -1 if meta_a["last_plan_date"] < meta_b["last_plan_date"] else 1

        if task_a.created_at != task_b.created_at:
            return -1 if task_a.created_at > task_b.created_at else 1
        return 0

    def _sort_tasks_for_tab(
        self,
        tasks: List[BacklogTask],
        tab: BacklogTab,
        link_meta: Dict[str, Dict[str, Any]],
    ) -> List[BacklogTask]:
        def sort_key(task: BacklogTask) -> Tuple[BacklogTask, Dict[str, Any]]:
            return task, link_meta.get(str(task.id), _EMPTY_LINK_META)

        items = [sort_key(task) for task in tasks]

        def compare(item_a: Tuple[BacklogTask, Dict[str, Any]], item_b: Tuple[BacklogTask, Dict[str, Any]]) -> int:
            return self._compare_tasks(item_a[0], item_a[1], item_b[0], item_b[1], tab)

        return [task for task, _ in sorted(items, key=cmp_to_key(compare))]

    def _batch_link_meta(self, task_ids: List[str]) -> Dict[str, Dict[str, Any]]:
        if not task_ids:
            return {}

        links = (
            self.db.query(BacklogDailyLink)
            .filter(BacklogDailyLink.backlog_task_id.in_(task_ids))
            .order_by(BacklogDailyLink.plan_date.desc())
            .all()
        )

        grouped: Dict[str, Dict[str, Any]] = {}
        for link in links:
            task_id = str(link.backlog_task_id)
            entry = grouped.setdefault(
                task_id,
                {"links": [], "dates": set()},
            )
            entry["links"].append(link)
            entry["dates"].add(link.plan_date)

        result: Dict[str, Dict[str, Any]] = {}
        for task_id, entry in grouped.items():
            sorted_dates = sorted(entry["dates"])
            result[task_id] = {
                "occurrence_count": len(entry["links"]),
                "is_scheduled": True,
                "last_plan_date": entry["links"][0].plan_date,
                "linked_dates": sorted_dates[:3],
            }
        return result

    def get_task(self, task_id: str) -> Optional[BacklogTask]:
        return self.db.query(BacklogTask).filter(BacklogTask.id == task_id).first()

    def get_links_for_backlog(self, backlog_task_id: str) -> List[BacklogDailyLink]:
        return (
            self.db.query(BacklogDailyLink)
            .filter(BacklogDailyLink.backlog_task_id == backlog_task_id)
            .order_by(BacklogDailyLink.plan_date.desc())
            .all()
        )

    def get_link_by_daily_task(self, daily_task_id: str) -> Optional[BacklogDailyLink]:
        return (
            self.db.query(BacklogDailyLink)
            .filter(BacklogDailyLink.daily_task_id == daily_task_id)
            .first()
        )

    def _resolve_link_progress(
        self,
        link: BacklogDailyLink,
        *,
        prev_after: int,
        backlog_progress: int,
    ) -> Tuple[int, int]:
        today = date.today()
        if link.plan_date >= today:
            after = backlog_progress
        elif link.progress_after is not None:
            after = link.progress_after
        else:
            after = backlog_progress
        delta = max(0, after - prev_after)
        return after, delta

    def batch_daily_task_progress(
        self, daily_task_ids: List[str]
    ) -> Dict[str, Dict[str, Optional[int]]]:
        """Progress snapshot + delta for daily tasks linked to backlog."""
        if not daily_task_ids:
            return {}

        links = (
            self.db.query(BacklogDailyLink)
            .filter(BacklogDailyLink.daily_task_id.in_(daily_task_ids))
            .all()
        )
        if not links:
            return {}

        backlog_ids = {link.backlog_task_id for link in links}
        backlog_progress_by_id = {
            str(row.id): row.progress
            for row in self.db.query(BacklogTask.id, BacklogTask.progress)
            .filter(BacklogTask.id.in_(backlog_ids))
            .all()
        }

        all_links = (
            self.db.query(BacklogDailyLink)
            .filter(BacklogDailyLink.backlog_task_id.in_(backlog_ids))
            .order_by(BacklogDailyLink.plan_date.asc())
            .all()
        )

        links_by_backlog: Dict[str, List[BacklogDailyLink]] = {}
        for link in all_links:
            links_by_backlog.setdefault(str(link.backlog_task_id), []).append(link)

        link_by_daily = {str(link.daily_task_id): link for link in links}
        result: Dict[str, Dict[str, Optional[int]]] = {}

        for daily_task_id in daily_task_ids:
            link = link_by_daily.get(daily_task_id)
            if link is None:
                continue

            progress_after: Optional[int] = None
            progress_delta: Optional[int] = None
            prev_after = 0
            for backlog_link in links_by_backlog.get(str(link.backlog_task_id), []):
                if backlog_link.id == link.id:
                    current_backlog_progress = backlog_progress_by_id.get(
                        str(link.backlog_task_id), 0
                    ) or 0
                    progress_after, progress_delta = self._resolve_link_progress(
                        backlog_link,
                        prev_after=prev_after,
                        backlog_progress=current_backlog_progress,
                    )
                    break
                if backlog_link.progress_after is not None:
                    prev_after = backlog_link.progress_after

            result[daily_task_id] = {
                "progress_after": progress_after if progress_after is not None else 0,
                "progress_delta": progress_delta if progress_delta is not None else 0,
            }

        return result

    def get_link_for_date(self, backlog_task_id: str, plan_date: date) -> Optional[BacklogDailyLink]:
        return (
            self.db.query(BacklogDailyLink)
            .filter(
                BacklogDailyLink.backlog_task_id == backlog_task_id,
                BacklogDailyLink.plan_date == plan_date,
            )
            .first()
        )

    def get_task_meta(self, task: BacklogTask) -> dict:
        links = self.get_links_for_backlog(str(task.id))
        sorted_dates = sorted({link.plan_date for link in links})
        return {
            "occurrence_count": len(links),
            "is_scheduled": len(links) > 0,
            "last_plan_date": links[0].plan_date if links else None,
            "linked_dates": sorted_dates[:3],
        }

    def _build_occurrence(self, link: BacklogDailyLink) -> BacklogOccurrence:
        daily_service = DailyProgressService(self.db)
        daily = daily_service.get_entry(str(link.daily_task_id))
        day_id = daily.daily_progress_day_id if daily else None
        return BacklogOccurrence(
            daily_task_id=link.daily_task_id,
            daily_progress_day_id=day_id,
            plan_date=link.plan_date,
            daily_status=daily.status if daily else None,
            daily_title=daily.title if daily else None,
            progress_after=link.progress_after,
            progress_delta=None,
            created_at=link.created_at or datetime.utcnow(),
        )

    def _build_occurrences_with_progress(self, links: List[BacklogDailyLink]) -> List[BacklogOccurrence]:
        sorted_asc = sorted(links, key=lambda link: link.plan_date)
        prev_after = 0
        built: List[BacklogOccurrence] = []
        backlog_progress = 0
        if sorted_asc:
            backlog = self.get_task(str(sorted_asc[0].backlog_task_id))
            backlog_progress = backlog.progress if backlog else 0

        for link in sorted_asc:
            occ = self._build_occurrence(link)
            after, delta = self._resolve_link_progress(
                link,
                prev_after=prev_after,
                backlog_progress=backlog_progress,
            )
            prev_after = after
            built.append(
                occ.model_copy(
                    update={
                        "progress_after": after,
                        "progress_delta": delta,
                    }
                )
            )
        built.reverse()
        return built

    def _record_progress_snapshot(
        self,
        task: BacklogTask,
        new_progress: int,
        *,
        plan_date: Optional[date] = None,
    ) -> None:
        if plan_date is not None:
            link = self.get_link_for_date(str(task.id), plan_date)
            if link is not None:
                link.progress_after = new_progress
            return

        today = date.today()
        for link in self.get_links_for_backlog(str(task.id)):
            if link.plan_date >= today:
                link.progress_after = new_progress

    def _sync_linked_daily_status_for_plan_date(
        self,
        backlog: BacklogTask,
        *,
        plan_date: date,
        progress: int,
    ) -> None:
        """Keep the linked daily occurrence in sync when progress is edited on daily plan UI."""
        link = self.get_link_for_date(str(backlog.id), plan_date)
        if link is None:
            return

        daily_task = (
            self.db.query(DailyProgressEntry).filter(DailyProgressEntry.id == link.daily_task_id).first()
        )
        if daily_task is None:
            return

        new_status = DailyProgressEntryStatus.DONE if progress >= 100 else DailyProgressEntryStatus.TODO
        if daily_task.status != new_status:
            daily_task.status = new_status

    def to_response(
        self, task: BacklogTask, *, possible_duplicate_count: int = 0
    ) -> BacklogTaskResponse:
        meta = self.get_task_meta(task)
        meta["possible_duplicate_count"] = possible_duplicate_count
        base = BacklogTaskResponse.model_validate(task)
        return base.model_copy(update=meta)

    def to_detail(self, task: BacklogTask) -> BacklogTaskDetail:
        links = self.get_links_for_backlog(str(task.id))
        meta = self.get_task_meta(task)
        occurrences = self._build_occurrences_with_progress(links)
        base = BacklogTaskResponse.model_validate(task)
        return BacklogTaskDetail(**base.model_copy(update=meta).model_dump(), occurrences=occurrences)

    @staticmethod
    def _completion_plan_date() -> date:
        return date.today()

    @staticmethod
    def _backlog_priority_to_daily(priority: TaskPriority) -> DailyProgressEntryPriority:
        return DailyProgressEntryPriority(priority.value)

    def _daily_task_payload(
        self,
        task: BacklogTask,
        *,
        status: DailyProgressEntryStatus = DailyProgressEntryStatus.TODO,
    ) -> DailyProgressEntryCreate:
        return DailyProgressEntryCreate(
            title=task.title,
            description=task.description,
            context=task.context,
            priority=self._backlog_priority_to_daily(task.priority),
            status=status,
        )

    def _create_link(
        self,
        backlog_task: BacklogTask,
        daily_task_id: str,
        plan_date: date,
    ) -> BacklogDailyLink:
        link = BacklogDailyLink(
            backlog_task_id=backlog_task.id,
            daily_task_id=daily_task_id,
            plan_date=plan_date,
        )
        self.db.add(link)
        backlog_task.daily_task_id = daily_task_id
        backlog_task.scheduled_date = plan_date
        return link

    def _sync_completed_daily_task(self, user_id: str, task: BacklogTask) -> None:
        """Ensure a completed daily task exists for today and link it to the backlog task."""
        plan_date = self._completion_plan_date()
        daily_service = DailyProgressService(self.db)

        existing_link = self.get_link_for_date(str(task.id), plan_date)
        if existing_link:
            daily_task = daily_service.get_entry(str(existing_link.daily_task_id))
            if daily_task:
                daily_service.update_entry(
                    str(daily_task.id),
                    DailyProgressEntryUpdate(
                        title=task.title,
                        description=task.description,
                        context=task.context,
                        priority=self._backlog_priority_to_daily(task.priority),
                        status=DailyProgressEntryStatus.DONE,
                    ),
                )
                existing_link.progress_after = task.progress
                task.scheduled_date = plan_date
                task.daily_task_id = daily_task.id
                return

        day, _ = daily_service.create_or_merge_day(
            user_id,
            DailyProgressDayCreate(progress_date=plan_date),
        )
        daily_task = daily_service.create_entry(
            str(day.id),
            self._daily_task_payload(task, status=DailyProgressEntryStatus.DONE),
            backlog_task_id=str(task.id),
        )
        if not daily_task:
            return

        self._create_link(task, str(daily_task.id), plan_date)
        daily_task.backlog_task_id = task.id
        link = self.get_link_for_date(str(task.id), plan_date)
        if link is not None:
            link.progress_after = task.progress

    def _link_backlog_to_plan(
        self,
        user_id: str,
        backlog: BacklogTask,
        plan_id: str,
        plan_date: date,
        *,
        daily_status: DailyProgressEntryStatus = DailyProgressEntryStatus.TODO,
    ):
        daily_service = DailyProgressService(self.db)
        existing_link = self.get_link_for_date(str(backlog.id), plan_date)
        if existing_link:
            daily_task = daily_service.get_entry(str(existing_link.daily_task_id))
            if daily_task:
                daily_service.update_entry(
                    str(daily_task.id),
                    DailyProgressEntryUpdate(
                        title=backlog.title,
                        description=backlog.description,
                        context=backlog.context,
                        priority=self._backlog_priority_to_daily(backlog.priority),
                    ),
                )
                backlog.daily_task_id = daily_task.id
                backlog.scheduled_date = plan_date
                return daily_task

        daily_task = daily_service.create_entry(
            plan_id,
            self._daily_task_payload(backlog, status=daily_status),
            backlog_task_id=str(backlog.id),
        )
        if not daily_task:
            return None

        self._create_link(backlog, str(daily_task.id), plan_date)
        return daily_task

    def _ensure_in_progress_daily_link(
        self,
        user_id: str,
        task: BacklogTask,
        *,
        plan_date: Optional[date] = None,
    ) -> None:
        """Backlog tasks in progress should always have at least one daily occurrence."""
        if task.status != BacklogTaskStatus.IN_PROGRESS:
            return
        if task.progress <= 0 or task.progress >= 100:
            return
        if self.get_links_for_backlog(str(task.id)):
            return

        target_date = plan_date or date.today()
        daily_service = DailyProgressService(self.db)
        day, _ = daily_service.create_or_merge_day(
            user_id,
            DailyProgressDayCreate(progress_date=target_date),
        )
        self._link_backlog_to_plan(
            user_id,
            task,
            str(day.id),
            target_date,
            daily_status=DailyProgressEntryStatus.IN_PROGRESS,
        )
        link = self.get_link_for_date(str(task.id), target_date)
        if link is not None:
            link.progress_after = task.progress

    def create_task(self, user_id: str, task_in: BacklogTaskCreate) -> BacklogTask:
        data = task_in.model_dump(exclude_unset=True)
        progress = data.pop("progress", 0)
        task = BacklogTask(**data, user_id=user_id, progress=progress)
        self.apply_progress(task, progress)
        self.db.add(task)
        self.db.flush()
        if progress == 100:
            self._sync_completed_daily_task(user_id, task)
        elif progress > 0:
            self._ensure_in_progress_daily_link(user_id, task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def update_task(self, task_id: str, task_in: BacklogTaskUpdate) -> Optional[BacklogTask]:
        task = self.get_task(task_id)
        if not task:
            return None

        update_data = task_in.model_dump(exclude_unset=True)
        new_progress = update_data.pop("progress", None)
        new_status = update_data.pop("status", None)
        progress_plan_date = update_data.pop("progress_plan_date", None)
        old_progress = task.progress

        for field, value in update_data.items():
            setattr(task, field, value)

        if new_progress is not None and new_status is not None:
            task.progress = new_progress
            task.status = new_status
            if new_progress == 100 or new_status == BacklogTaskStatus.DONE:
                task.completed_at = datetime.utcnow()
                if progress_plan_date is None:
                    self._sync_completed_daily_task(str(task.user_id), task)
            else:
                task.completed_at = None
        elif new_status is not None:
            if new_status == BacklogTaskStatus.PENDING:
                task.status = BacklogTaskStatus.PENDING
                task.progress = 0
                task.completed_at = None
            elif new_status == BacklogTaskStatus.DONE:
                self.apply_progress(task, 100)
                if progress_plan_date is None:
                    self._sync_completed_daily_task(str(task.user_id), task)
            elif new_status == BacklogTaskStatus.IN_PROGRESS:
                task.status = BacklogTaskStatus.IN_PROGRESS
                task.completed_at = None
        elif new_progress is not None and new_progress != old_progress:
            self.apply_progress(task, new_progress)
            if new_progress == 100 and progress_plan_date is None:
                self._sync_completed_daily_task(str(task.user_id), task)

        if (
            task.status == BacklogTaskStatus.IN_PROGRESS
            and 0 < task.progress < 100
            and not self.get_links_for_backlog(str(task.id))
        ):
            self._ensure_in_progress_daily_link(
                str(task.user_id),
                task,
                plan_date=progress_plan_date,
            )

        if task.progress != old_progress:
            self._record_progress_snapshot(
                task,
                task.progress,
                plan_date=progress_plan_date,
            )
            if progress_plan_date is not None:
                self._sync_linked_daily_status_for_plan_date(
                    task,
                    plan_date=progress_plan_date,
                    progress=task.progress,
                )

        self.db.commit()
        self.db.refresh(task)
        return task

    def delete_task(self, task_id: str) -> bool:
        task = self.get_task(task_id)
        if not task:
            return False

        links = self.get_links_for_backlog(task_id)
        daily_task_ids = {link.daily_task_id for link in links}

        linked_dailies = (
            self.db.query(DailyProgressEntry.id)
            .filter(DailyProgressEntry.backlog_task_id == task.id)
            .all()
        )
        daily_task_ids.update(row.id for row in linked_dailies)

        for daily_task_id in daily_task_ids:
            daily = self.db.query(DailyProgressEntry).filter(DailyProgressEntry.id == daily_task_id).first()
            if daily is not None:
                self.db.delete(daily)

        self.db.flush()
        self.db.delete(task)
        self.db.commit()
        return True

    def complete_task(self, task_id: str) -> Optional[BacklogTask]:
        task = self.get_task(task_id)
        if not task:
            return None
        if task.progress == 100:
            return task

        self.apply_progress(task, 100)
        self._sync_completed_daily_task(str(task.user_id), task)
        self._record_progress_snapshot(task, 100)
        self.db.commit()
        self.db.refresh(task)
        return task

    def schedule_task(
        self, user_id: str, task_id: str, schedule_in: BacklogTaskSchedule
    ) -> Optional[BacklogTask]:
        task = self.get_task(task_id)
        if not task:
            return None
        if task.progress == 100:
            return None

        daily_service = DailyProgressService(self.db)
        day, _ = daily_service.create_or_merge_day(
            user_id,
            DailyProgressDayCreate(progress_date=schedule_in.plan_date),
        )

        self._link_backlog_to_plan(
            user_id,
            task,
            str(day.id),
            schedule_in.plan_date,
        )
        self.db.commit()
        self.db.refresh(task)
        return task

    def revert_to_inbox(self, task_id: str) -> Optional[BacklogTask]:
        """Reset progress to 0 (move back to pending); keeps daily links."""
        task = self.get_task(task_id)
        if not task:
            return None
        if task.status == BacklogTaskStatus.PENDING and task.progress == 0:
            return task

        task.status = BacklogTaskStatus.PENDING
        task.progress = 0
        task.completed_at = None
        self._record_progress_snapshot(task, 0)
        self.db.commit()
        self.db.refresh(task)
        return task

    def add_to_daily_progress_day(
        self,
        user_id: str,
        day_id: str,
        data: DailyProgressEntryAdd,
    ):
        daily_service = DailyProgressService(self.db)
        day = daily_service.get_day(day_id)
        if not day:
            return None

        daily_status = data.status

        if data.backlog_task_id:
            backlog = self.get_task(str(data.backlog_task_id))
            if not backlog or str(backlog.user_id) != user_id:
                return None
            return self._link_backlog_to_plan(
                user_id,
                backlog,
                day_id,
                day.progress_date,
                daily_status=daily_status,
            )

        progress = 100 if daily_status == DailyProgressEntryStatus.DONE else 0
        if daily_status == DailyProgressEntryStatus.IN_PROGRESS:
            progress = 50

        backlog = BacklogTask(
            title=data.title.strip(),
            description=data.description,
            context=data.context,
            priority=TaskPriority(data.priority.value),
            user_id=user_id,
            origin="daily",
            progress=progress,
        )
        self.apply_progress(backlog, progress)
        self.db.add(backlog)
        self.db.flush()

        daily_task = self._link_backlog_to_plan(
            user_id,
            backlog,
            day_id,
            day.progress_date,
            daily_status=daily_status,
        )
        if progress == 100:
            self._sync_completed_daily_task(user_id, backlog)
        self.db.commit()
        if daily_task:
            self.db.refresh(daily_task)
        return daily_task

    def backfill_progress_snapshots(self, user_id: Optional[str] = None) -> int:
        """Backfill missing progress_after on daily links from backlog/daily state."""
        query = self.db.query(BacklogTask)
        if user_id is not None:
            query = query.filter(BacklogTask.user_id == user_id)

        updated = 0
        for backlog in query.all():
            links = (
                self.db.query(BacklogDailyLink)
                .filter(BacklogDailyLink.backlog_task_id == backlog.id)
                .order_by(BacklogDailyLink.plan_date.asc())
                .all()
            )
            if not links:
                continue

            last_backfill_link: Optional[BacklogDailyLink] = None
            for link in reversed(links):
                if link.progress_after is not None:
                    break
                daily = self.db.query(DailyProgressEntry).filter(DailyProgressEntry.id == link.daily_task_id).first()
                if daily and daily.status == DailyProgressEntryStatus.DONE:
                    last_backfill_link = link
                    break
            if last_backfill_link is None:
                for link in reversed(links):
                    if link.progress_after is None:
                        last_backfill_link = link
                        break

            prev_after = 0
            for link in links:
                if link.progress_after is not None:
                    prev_after = link.progress_after
                    continue

                if last_backfill_link is not None and link.id == last_backfill_link.id:
                    link.progress_after = max(prev_after, backlog.progress)
                else:
                    link.progress_after = prev_after
                prev_after = link.progress_after
                updated += 1

        return updated

    def sync_from_daily_task(self, daily_task_id: str, *, is_done: bool) -> None:
        """Record progress snapshot on the daily link when a day is marked done."""
        if not is_done:
            return

        link = self.get_link_by_daily_task(daily_task_id)
        if link is None:
            return

        backlog = self.get_task(str(link.backlog_task_id))
        if backlog is None:
            return

        link.progress_after = backlog.progress
        self.db.commit()
