from datetime import datetime, date
from typing import List, Optional, Literal

from sqlalchemy import cast, Date
from sqlalchemy.orm import Session

from app.models.backlog_daily_link import BacklogDailyLink
from app.models.backlog_task import BacklogTask, BacklogTaskStatus
from app.models.daily_plan import DailyTaskPriority, DailyTaskStatus
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
from app.schemas.daily_plan import DailyPlanCreate, DailyTaskCreate, DailyTaskUpdate, DailyPlanTaskAdd
from app.services.daily_plan_service import DailyPlanService

BacklogTimeField = Literal["created", "scheduled", "completed"]
BacklogTab = Literal["pending", "in_progress", "done", "active"]


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
    ) -> List[BacklogTask]:
        query = self.db.query(BacklogTask).filter(BacklogTask.user_id == user_id)

        if tab == "pending":
            query = query.filter(BacklogTask.progress == 0)
        elif tab == "in_progress":
            query = query.filter(BacklogTask.progress > 0, BacklogTask.progress < 100)
        elif tab == "done":
            query = query.filter(BacklogTask.progress == 100)
        elif tab == "active":
            query = query.filter(BacklogTask.progress < 100)

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

        if tab == "done":
            return query.order_by(BacklogTask.completed_at.desc(), BacklogTask.created_at.desc()).all()
        return query.order_by(BacklogTask.created_at.desc()).all()

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
        daily_service = DailyPlanService(self.db)
        daily = daily_service.get_task(str(link.daily_task_id))
        return BacklogOccurrence(
            daily_task_id=link.daily_task_id,
            daily_plan_id=daily.daily_plan_id if daily else None,
            plan_date=link.plan_date,
            daily_status=daily.status if daily else None,
            daily_title=daily.title if daily else None,
            created_at=link.created_at or datetime.utcnow(),
        )

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
        occurrences = [self._build_occurrence(link) for link in links]
        base = BacklogTaskResponse.model_validate(task)
        return BacklogTaskDetail(**base.model_copy(update=meta).model_dump(), occurrences=occurrences)

    @staticmethod
    def _completion_plan_date() -> date:
        return date.today()

    @staticmethod
    def _backlog_priority_to_daily(priority: TaskPriority) -> DailyTaskPriority:
        return DailyTaskPriority(priority.value)

    def _daily_task_payload(
        self,
        task: BacklogTask,
        *,
        status: DailyTaskStatus = DailyTaskStatus.TODO,
    ) -> DailyTaskCreate:
        return DailyTaskCreate(
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
        daily_service = DailyPlanService(self.db)

        existing_link = self.get_link_for_date(str(task.id), plan_date)
        if existing_link:
            daily_task = daily_service.get_task(str(existing_link.daily_task_id))
            if daily_task:
                daily_service.update_task(
                    str(daily_task.id),
                    DailyTaskUpdate(
                        title=task.title,
                        description=task.description,
                        context=task.context,
                        priority=self._backlog_priority_to_daily(task.priority),
                        status=DailyTaskStatus.DONE,
                    ),
                )
                task.scheduled_date = plan_date
                task.daily_task_id = daily_task.id
                return

        plan, _ = daily_service.create_or_merge_plan(
            user_id,
            DailyPlanCreate(plan_date=plan_date),
        )
        daily_task = daily_service.create_task(
            str(plan.id),
            self._daily_task_payload(task, status=DailyTaskStatus.DONE),
            backlog_task_id=str(task.id),
        )
        if not daily_task:
            return

        self._create_link(task, str(daily_task.id), plan_date)
        daily_task.backlog_task_id = task.id

    def _link_backlog_to_plan(
        self,
        user_id: str,
        backlog: BacklogTask,
        plan_id: str,
        plan_date: date,
        *,
        daily_status: DailyTaskStatus = DailyTaskStatus.TODO,
    ):
        daily_service = DailyPlanService(self.db)
        existing_link = self.get_link_for_date(str(backlog.id), plan_date)
        if existing_link:
            daily_task = daily_service.get_task(str(existing_link.daily_task_id))
            if daily_task:
                daily_service.update_task(
                    str(daily_task.id),
                    DailyTaskUpdate(
                        title=backlog.title,
                        description=backlog.description,
                        context=backlog.context,
                        priority=self._backlog_priority_to_daily(backlog.priority),
                    ),
                )
                backlog.daily_task_id = daily_task.id
                backlog.scheduled_date = plan_date
                return daily_task

        daily_task = daily_service.create_task(
            plan_id,
            self._daily_task_payload(backlog, status=daily_status),
            backlog_task_id=str(backlog.id),
        )
        if not daily_task:
            return None

        self._create_link(backlog, str(daily_task.id), plan_date)
        return daily_task

    def create_task(self, user_id: str, task_in: BacklogTaskCreate) -> BacklogTask:
        data = task_in.model_dump(exclude_unset=True)
        progress = data.pop("progress", 0)
        task = BacklogTask(**data, user_id=user_id, progress=progress)
        self.apply_progress(task, progress)
        self.db.add(task)
        if progress == 100:
            self._sync_completed_daily_task(user_id, task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def update_task(self, task_id: str, task_in: BacklogTaskUpdate) -> Optional[BacklogTask]:
        task = self.get_task(task_id)
        if not task:
            return None

        update_data = task_in.model_dump(exclude_unset=True)
        new_progress = update_data.pop("progress", None)
        old_progress = task.progress

        for field, value in update_data.items():
            setattr(task, field, value)

        if new_progress is not None and new_progress != old_progress:
            self.apply_progress(task, new_progress)
            if new_progress == 100:
                self._sync_completed_daily_task(str(task.user_id), task)

        self.db.commit()
        self.db.refresh(task)
        return task

    def delete_task(self, task_id: str) -> bool:
        task = self.get_task(task_id)
        if not task:
            return False

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

        daily_service = DailyPlanService(self.db)
        plan, _ = daily_service.create_or_merge_plan(
            user_id,
            DailyPlanCreate(plan_date=schedule_in.plan_date),
        )

        self._link_backlog_to_plan(
            user_id,
            task,
            str(plan.id),
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
        if task.progress == 0:
            return task

        self.apply_progress(task, 0)
        self.db.commit()
        self.db.refresh(task)
        return task

    def add_to_daily_plan(
        self,
        user_id: str,
        plan_id: str,
        data: DailyPlanTaskAdd,
    ):
        daily_service = DailyPlanService(self.db)
        plan = daily_service.get_plan(plan_id)
        if not plan:
            return None

        daily_status = data.status

        if data.backlog_task_id:
            backlog = self.get_task(str(data.backlog_task_id))
            if not backlog or str(backlog.user_id) != user_id:
                return None
            return self._link_backlog_to_plan(
                user_id,
                backlog,
                plan_id,
                plan.plan_date,
                daily_status=daily_status,
            )

        progress = 100 if daily_status == DailyTaskStatus.DONE else 0
        if daily_status == DailyTaskStatus.IN_PROGRESS:
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
            plan_id,
            plan.plan_date,
            daily_status=daily_status,
        )
        if progress == 100:
            self._sync_completed_daily_task(user_id, backlog)
        self.db.commit()
        if daily_task:
            self.db.refresh(daily_task)
        return daily_task

    def sync_from_daily_task(self, daily_task_id: str, *, is_done: bool) -> None:
        """Legacy hook — backlog progress is updated explicitly by the client."""
        return
