from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.monthly_plan import MonthlyPlan, MonthlyTask, TaskPriority, TaskStatus
from app.schemas.monthly_plan import MonthlyPlanCreate, MonthlyPlanUpdate, MonthlyTaskCreate, MonthlyTaskUpdate


class MonthlyPlanService:
    def __init__(self, db: Session):
        self.db = db

    def get_user_plans(
        self,
        user_id: str,
        year: Optional[int] = None,
        month: Optional[int] = None,
    ) -> List[MonthlyPlan]:
        """Get all monthly plans for a user with optional filters."""
        query = self.db.query(MonthlyPlan).filter(MonthlyPlan.user_id == user_id)

        if year:
            query = query.filter(MonthlyPlan.year == year)
        if month:
            query = query.filter(MonthlyPlan.month == month)

        return query.order_by(
            MonthlyPlan.year.desc(),
            MonthlyPlan.month.desc()
        ).all()

    def get_plan(self, plan_id: str) -> Optional[MonthlyPlan]:
        """Get a single plan by ID."""
        return self.db.query(MonthlyPlan).filter(MonthlyPlan.id == plan_id).first()

    def create_plan(self, user_id: str, plan_in: MonthlyPlanCreate) -> MonthlyPlan:
        """Create a new monthly plan."""
        plan_data = plan_in.model_dump(exclude_unset=True)

        # Set default title if not provided
        if not plan_data.get("title"):
            plan_data["title"] = f"{plan_data['year']}年{plan_data['month']}月计划"

        plan = MonthlyPlan(**plan_data, user_id=user_id)
        self.db.add(plan)
        self.db.commit()
        self.db.refresh(plan)
        return plan

    def update_plan(self, plan_id: str, plan_in: MonthlyPlanUpdate) -> Optional[MonthlyPlan]:
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

    def get_plan_tasks(self, plan_id: str) -> List[MonthlyTask]:
        """Get all tasks for a plan."""
        return (
            self.db.query(MonthlyTask)
            .filter(MonthlyTask.monthly_plan_id == plan_id)
            .order_by(MonthlyTask.priority.desc(), MonthlyTask.created_at)
            .all()
        )

    def get_task(self, task_id: str) -> Optional[MonthlyTask]:
        """Get a single task by ID."""
        return self.db.query(MonthlyTask).filter(MonthlyTask.id == task_id).first()

    def create_task(self, plan_id: str, task_in: MonthlyTaskCreate) -> Optional[MonthlyTask]:
        """Create a new task for a plan."""
        plan = self.get_plan(plan_id)
        if not plan:
            return None

        task_data = task_in.model_dump(exclude_unset=True)
        task = MonthlyTask(**task_data, monthly_plan_id=plan_id)
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def update_task(self, task_id: str, task_in: MonthlyTaskUpdate) -> Optional[MonthlyTask]:
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
        self, task_id: str, status: TaskStatus
    ) -> Optional[MonthlyTask]:
        """Update task status."""
        task = self.get_task(task_id)
        if not task:
            return None

        task.status = status
        self.db.commit()
        self.db.refresh(task)
        return task
