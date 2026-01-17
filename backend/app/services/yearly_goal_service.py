from typing import List, Optional
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.yearly_goal import YearlyGoal, MonthlyMilestone, GoalStatus
from app.schemas.yearly_goal import YearlyGoalCreate, YearlyGoalUpdate, ProgressUpdate


class YearlyGoalService:
    def __init__(self, db: Session):
        self.db = db

    def get_user_goals(
        self,
        user_id: str,
        year: Optional[int] = None,
        category: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[YearlyGoal]:
        """Get all yearly goals for a user with optional filters."""
        query = self.db.query(YearlyGoal).filter(YearlyGoal.user_id == user_id)

        if year:
            query = query.filter(YearlyGoal.year == year)
        if category:
            query = query.filter(YearlyGoal.category == category)
        if status:
            query = query.filter(YearlyGoal.status == status)

        return query.order_by(YearlyGoal.year.desc()).all()

    def get_goal(self, goal_id: str) -> Optional[YearlyGoal]:
        """Get a single goal by ID."""
        return self.db.query(YearlyGoal).filter(YearlyGoal.id == goal_id).first()

    def create_goal(self, user_id: str, goal_in: YearlyGoalCreate) -> YearlyGoal:
        """Create a new yearly goal with optional auto-generated milestones."""
        goal_data = goal_in.model_dump(exclude={"auto_generate_milestones"})

        goal = YearlyGoal(**goal_data, user_id=user_id)
        goal.status = GoalStatus.IN_PROGRESS

        self.db.add(goal)
        self.db.flush()  # Get the ID

        # Auto-generate monthly milestones if requested
        if goal_in.auto_generate_milestones:
            self._generate_milestones(goal)

        self.db.commit()
        self.db.refresh(goal)
        return goal

    def update_goal(self, goal_id: str, goal_in: YearlyGoalUpdate) -> Optional[YearlyGoal]:
        """Update an existing goal."""
        goal = self.get_goal(goal_id)
        if not goal:
            return None

        update_data = goal_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(goal, field, value)

        # Auto-update status based on completion
        if goal.current_value >= goal.target_value:
            goal.status = GoalStatus.COMPLETED

        self.db.commit()
        self.db.refresh(goal)
        return goal

    def update_progress(
        self, goal_id: str, progress_in: ProgressUpdate
    ) -> Optional[YearlyGoal]:
        """Update goal progress and optionally milestone."""
        goal = self.get_goal(goal_id)
        if not goal:
            return None

        # Update current value (convert float to Decimal for compatibility)
        goal.current_value += Decimal(str(progress_in.progress))

        # Update milestone if month is provided
        if progress_in.month:
            milestone = (
                self.db.query(MonthlyMilestone)
                .filter(
                    and_(
                        MonthlyMilestone.yearly_goal_id == goal_id,
                        MonthlyMilestone.month == progress_in.month,
                    )
                )
                .first()
            )
            if milestone:
                milestone.achieved_value += Decimal(str(progress_in.progress))
                if progress_in.note:
                    milestone.note = progress_in.note

        # Auto-update status based on completion
        if goal.current_value >= goal.target_value:
            goal.status = GoalStatus.COMPLETED
        elif goal.current_value > 0:
            goal.status = GoalStatus.IN_PROGRESS

        self.db.commit()
        self.db.refresh(goal)
        return goal

    def delete_goal(self, goal_id: str) -> bool:
        """Delete a goal."""
        goal = self.get_goal(goal_id)
        if not goal:
            return False

        self.db.delete(goal)
        self.db.commit()
        return True

    def _generate_milestones(self, goal: YearlyGoal) -> None:
        """Generate monthly milestones for a goal."""
        monthly_target = round(float(goal.target_value) / 12, 2)

        for month in range(1, 13):
            milestone = MonthlyMilestone(
                yearly_goal_id=goal.id,
                month=month,
                target_value=monthly_target,
                achieved_value=0,
            )
            self.db.add(milestone)
