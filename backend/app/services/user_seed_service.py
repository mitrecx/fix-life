"""Seed starter data for newly registered users."""
import logging
from datetime import date
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.daily_progress import DailySummary, SummaryType
from app.models.task_context import TaskContext
from app.models.task_priority import TaskPriority
from app.models.yearly_goal import GoalCategory
from app.schemas.backlog_task import BacklogTaskCreate, BacklogTaskSchedule
from app.schemas.monthly_plan import MonthlyPlanCreate, MonthlyTaskCreate
from app.schemas.quick_note import QuickNoteCreate
from app.schemas.yearly_goal import YearlyGoalCreate
from app.services.backlog_task_service import BacklogTaskService
from app.services.daily_progress_service import DailyProgressService
from app.services.monthly_plan_service import MonthlyPlanService
from app.services.quick_note_service import QuickNoteService
from app.services.yearly_goal_service import YearlyGoalService

logger = logging.getLogger(__name__)


def try_seed_new_user(db: Session, user_id: str) -> None:
    """Best-effort seed; never raises so login/registration stays usable."""
    try:
        UserSeedService(db).seed_for_new_user(user_id)
    except Exception:
        logger.exception("Failed to seed starter data for user %s", user_id)


class UserSeedService:
    def __init__(self, db: Session):
        self.db = db

    def seed_for_new_user(self, user_id: str) -> None:
        uid = str(user_id)
        user_uuid = UUID(uid)
        today = date.today()
        year = today.year

        backlog = BacklogTaskService(self.db)
        welcome = backlog.create_task(
            uid,
            BacklogTaskCreate(
                title="了解 FixLife 待办收件箱",
                description="待办会在这里收集，安排后会出现在「每日」里执行。",
                context=TaskContext.LEARNING,
                priority=TaskPriority.MEDIUM,
            ),
        )
        backlog.create_task(
            uid,
            BacklogTaskCreate(
                title="学习一项新技能",
                description="挑一个小主题，安排到本周某一天开始推进。",
                context=TaskContext.LEARNING,
                priority=TaskPriority.MEDIUM,
            ),
        )
        in_progress = backlog.create_task(
            uid,
            BacklogTaskCreate(
                title="整理本周优先级",
                description="把最重要的 3 件事安排进每日进度。",
                context=TaskContext.WORK,
                priority=TaskPriority.HIGH,
                progress=40,
            ),
        )

        backlog.schedule_task(uid, str(welcome.id), BacklogTaskSchedule(plan_date=today))
        backlog.schedule_task(uid, str(in_progress.id), BacklogTaskSchedule(plan_date=today))

        notes = QuickNoteService(self.db)
        for content in (
            "欢迎使用 FixLife！这是你的第一条随手记。",
            "提示：把灵感随手记下来，之后可以搜索和合并。",
        ):
            notes.create_note(user_uuid, QuickNoteCreate(content=content))

        goals = YearlyGoalService(self.db)
        goal = goals.create_goal(
            uid,
            YearlyGoalCreate(
                year=year,
                title="养成持续记录与复盘的习惯",
                description="用待办、每日进度和随手记，让每周都有一点可见的进展。",
                category=GoalCategory.LEARNING,
                target_value=52,
                unit="周",
                auto_generate_milestones=False,
            ),
        )

        plans = MonthlyPlanService(self.db)
        plan = plans.create_plan(
            uid,
            MonthlyPlanCreate(
                year=year,
                month=today.month,
                title=f"{year}年{today.month}月计划",
                focus_areas=["工作", "学习"],
                notes="这是示例月计划，可在「计划」中编辑。",
                yearly_goal_id=goal.id,
            ),
        )
        plans.create_task(
            str(plan.id),
            MonthlyTaskCreate(
                title="完成一次周复盘",
                description="回顾本周每日进度，写下收获与下周重点。",
                context=TaskContext.LEARNING,
            ),
        )

        self._seed_daily_summary(uid, today)
        logger.info("Seeded starter data for user %s", uid)

    def _seed_daily_summary(self, user_id: str, progress_date: date) -> None:
        daily = DailyProgressService(self.db)
        day = daily.get_day_by_date(user_id, progress_date)
        if not day:
            return

        existing = (
            self.db.query(DailySummary)
            .filter(DailySummary.daily_progress_day_id == day.id)
            .first()
        )
        if existing:
            return

        summary = DailySummary(
            daily_progress_day_id=day.id,
            user_id=UUID(user_id),
            summary_type=SummaryType.DAILY,
            content="示例日总结：今天先把待办安排进每日，再随手记下灵感。",
        )
        self.db.add(summary)
        self.db.commit()
