from datetime import datetime, date
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.backlog_task import BacklogTask, BacklogTaskStatus
from app.models.daily_plan import DailyTaskStatus
from app.models.task_context import TaskContext
from app.schemas.backlog_task import BacklogTaskCreate, BacklogTaskUpdate, BacklogTaskSchedule
from app.schemas.daily_plan import DailyPlanCreate, DailyTaskCreate
from app.services.daily_plan_service import DailyPlanService


class BacklogTaskService:
    def __init__(self, db: Session):
        self.db = db

    def get_user_tasks(
        self,
        user_id: str,
        *,
        active_only: bool = True,
        context: Optional[TaskContext] = None,
    ) -> List[BacklogTask]:
        query = self.db.query(BacklogTask).filter(BacklogTask.user_id == user_id)

        if active_only:
            query = query.filter(
                BacklogTask.status.in_([BacklogTaskStatus.PENDING, BacklogTaskStatus.SCHEDULED])
            )
        else:
            query = query.filter(BacklogTask.status == BacklogTaskStatus.DONE)

        if context is not None:
            query = query.filter(BacklogTask.context == context)

        if active_only:
            return query.order_by(BacklogTask.created_at.desc()).all()
        return query.order_by(BacklogTask.completed_at.desc(), BacklogTask.created_at.desc()).all()

    def get_task(self, task_id: str) -> Optional[BacklogTask]:
        return self.db.query(BacklogTask).filter(BacklogTask.id == task_id).first()

    def create_task(self, user_id: str, task_in: BacklogTaskCreate) -> BacklogTask:
        task = BacklogTask(**task_in.model_dump(exclude_unset=True), user_id=user_id)
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def update_task(self, task_id: str, task_in: BacklogTaskUpdate) -> Optional[BacklogTask]:
        task = self.get_task(task_id)
        if not task:
            return None

        update_data = task_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(task, field, value)

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
        if task.status == BacklogTaskStatus.DONE:
            return task

        task.status = BacklogTaskStatus.DONE
        task.completed_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(task)
        return task

    def schedule_task(
        self, user_id: str, task_id: str, schedule_in: BacklogTaskSchedule
    ) -> Optional[BacklogTask]:
        task = self.get_task(task_id)
        if not task:
            return None
        if task.status == BacklogTaskStatus.DONE:
            return None

        daily_service = DailyPlanService(self.db)
        plan, _ = daily_service.create_or_merge_plan(
            user_id,
            DailyPlanCreate(plan_date=schedule_in.plan_date),
        )

        daily_task = daily_service.create_task(
            str(plan.id),
            DailyTaskCreate(
                title=task.title,
                description=task.description,
                context=task.context,
                status=DailyTaskStatus.TODO,
            ),
        )
        if not daily_task:
            return None

        task.status = BacklogTaskStatus.SCHEDULED
        task.scheduled_date = schedule_in.plan_date
        task.daily_task_id = daily_task.id
        self.db.commit()
        self.db.refresh(task)
        return task

    def revert_to_inbox(self, task_id: str) -> Optional[BacklogTask]:
        """Move task back to pending inbox; clears schedule/completion and removes linked daily task."""
        task = self.get_task(task_id)
        if not task:
            return None
        if task.status == BacklogTaskStatus.PENDING:
            return task

        if task.daily_task_id:
            DailyPlanService(self.db).delete_task(str(task.daily_task_id))

        task.status = BacklogTaskStatus.PENDING
        task.completed_at = None
        task.scheduled_date = None
        task.daily_task_id = None
        self.db.commit()
        self.db.refresh(task)
        return task

    def sync_from_daily_task(self, daily_task_id: str, *, is_done: bool) -> None:
        task = (
            self.db.query(BacklogTask)
            .filter(BacklogTask.daily_task_id == daily_task_id)
            .first()
        )
        if not task:
            return

        if is_done and task.status != BacklogTaskStatus.DONE:
            task.status = BacklogTaskStatus.DONE
            task.completed_at = datetime.utcnow()
            self.db.commit()
        elif not is_done and task.status == BacklogTaskStatus.DONE:
            task.status = BacklogTaskStatus.SCHEDULED
            task.completed_at = None
            self.db.commit()
