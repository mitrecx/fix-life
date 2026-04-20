from typing import List, Optional, Tuple
from datetime import date
from sqlalchemy.orm import Session, load_only
from sqlalchemy import and_
from sqlalchemy.exc import IntegrityError

from app.models.daily_plan import DailyPlan, DailyTask, DailyTaskPriority, DailyTaskStatus
from app.schemas.daily_plan import DailyPlanCreate, DailyPlanUpdate, DailyTaskCreate, DailyTaskUpdate


class DailyPlanService:
    def __init__(self, db: Session):
        self.db = db

    def get_user_plans(
        self,
        user_id: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[DailyPlan]:
        """Get all daily plans for a user with optional date range filter."""
        query = self.db.query(DailyPlan).filter(DailyPlan.user_id == user_id)

        if start_date:
            query = query.filter(DailyPlan.plan_date >= start_date)
        if end_date:
            query = query.filter(DailyPlan.plan_date <= end_date)

        return query.order_by(DailyPlan.plan_date.desc()).all()

    def get_plan(self, plan_id: str) -> Optional[DailyPlan]:
        """Get a single plan by ID."""
        return self.db.query(DailyPlan).filter(DailyPlan.id == plan_id).first()

    def get_plan_by_date(self, user_id: str, plan_date: date) -> Optional[DailyPlan]:
        """Get a plan by user and date."""
        return (
            self.db.query(DailyPlan)
            .filter(
                and_(
                    DailyPlan.user_id == user_id,
                    DailyPlan.plan_date == plan_date
                )
            )
            .first()
        )

    def get_plan_head_by_date(self, user_id: str, plan_date: date) -> Optional[DailyPlan]:
        """Same as get_plan_by_date but avoid loading relationships (no task lazy load)."""
        return (
            self.db.query(DailyPlan)
            .options(
                load_only(
                    DailyPlan.id,
                    DailyPlan.user_id,
                    DailyPlan.plan_date,
                    DailyPlan.title,
                    DailyPlan.notes,
                    DailyPlan.monthly_plan_id,
                    DailyPlan.created_at,
                    DailyPlan.updated_at,
                )
            )
            .filter(
                and_(
                    DailyPlan.user_id == user_id,
                    DailyPlan.plan_date == plan_date,
                )
            )
            .first()
        )

    def _merge_incoming_into_plan(self, plan: DailyPlan, plan_in: DailyPlanCreate) -> None:
        """Apply merge rules from spec (title A, notes append, monthly_plan_id if empty)."""
        data = plan_in.model_dump(exclude_unset=True)

        new_title = data.get("title")
        if new_title is not None and str(new_title).strip():
            plan.title = new_title

        new_notes = data.get("notes")
        if new_notes is not None and str(new_notes).strip():
            incoming = str(new_notes).strip()
            if plan.notes and str(plan.notes).strip():
                plan.notes = str(plan.notes).rstrip() + "\n---\n" + incoming
            else:
                plan.notes = incoming

        new_mid = data.get("monthly_plan_id")
        if plan.monthly_plan_id is None and new_mid is not None:
            plan.monthly_plan_id = new_mid

    def create_or_merge_plan(self, user_id: str, plan_in: DailyPlanCreate) -> Tuple[DailyPlan, bool]:
        """
        Create a new plan or merge into existing same-day plan.
        Returns (plan, created) where created is True if a new row was inserted.
        """
        existing = self.get_plan_by_date(user_id, plan_in.plan_date)
        if existing:
            self._merge_incoming_into_plan(existing, plan_in)
            self.db.commit()
            self.db.refresh(existing)
            return existing, False
        try:
            plan = self.create_plan(user_id, plan_in)
            return plan, True
        except IntegrityError:
            self.db.rollback()
            existing = self.get_plan_by_date(user_id, plan_in.plan_date)
            if existing:
                self._merge_incoming_into_plan(existing, plan_in)
                self.db.commit()
                self.db.refresh(existing)
                return existing, False
            raise

    def create_plan(self, user_id: str, plan_in: DailyPlanCreate) -> DailyPlan:
        """Create a new daily plan."""
        plan_data = plan_in.model_dump(exclude_unset=True)

        # Set default title if not provided
        if not plan_data.get("title"):
            plan_data["title"] = f"{plan_data['plan_date']} 日计划"

        plan = DailyPlan(**plan_data, user_id=user_id)
        self.db.add(plan)
        self.db.commit()
        self.db.refresh(plan)
        return plan

    def update_plan(self, plan_id: str, plan_in: DailyPlanUpdate) -> Optional[DailyPlan]:
        """Update an existing plan."""
        plan = self.get_plan(plan_id)
        if not plan:
            return None

        update_data = plan_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(plan, field, value)

        self.db.commit()
        self.db.refresh(plan)
        return plan

    def delete_plan(self, plan_id: str) -> bool:
        """Delete a plan."""
        plan = self.get_plan(plan_id)
        if not plan:
            return False

        self.db.delete(plan)
        self.db.commit()
        return True

    # ===== Task Methods =====

    def get_plan_tasks(self, plan_id: str) -> List[DailyTask]:
        """Get all tasks for a plan."""
        return (
            self.db.query(DailyTask)
            .filter(DailyTask.daily_plan_id == plan_id)
            .order_by(DailyTask.time_slot, DailyTask.priority.desc(), DailyTask.created_at)
            .all()
        )

    def get_task(self, task_id: str) -> Optional[DailyTask]:
        """Get a single task by ID."""
        return self.db.query(DailyTask).filter(DailyTask.id == task_id).first()

    def create_task(self, plan_id: str, task_in: DailyTaskCreate) -> Optional[DailyTask]:
        """Create a new task for a plan."""
        plan = self.get_plan(plan_id)
        if not plan:
            return None

        task_data = task_in.model_dump(exclude_unset=True)
        task = DailyTask(**task_data, daily_plan_id=plan_id)
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def update_task(self, task_id: str, task_in: DailyTaskUpdate) -> Optional[DailyTask]:
        """Update an existing task."""
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
        """Delete a task."""
        task = self.get_task(task_id)
        if not task:
            return False

        self.db.delete(task)
        self.db.commit()
        return True

    def update_task_status(
        self, task_id: str, status: DailyTaskStatus
    ) -> Optional[DailyTask]:
        """Update task status."""
        task = self.get_task(task_id)
        if not task:
            return None

        task.status = status
        self.db.commit()
        self.db.refresh(task)
        return task
