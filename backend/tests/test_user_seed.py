"""Tests for new-user starter data seeding."""

from datetime import date
from unittest.mock import ANY, MagicMock, patch
from uuid import uuid4

import pytest

from app.services.user_seed_service import UserSeedService, try_seed_new_user


@pytest.fixture
def user_id():
    return str(uuid4())


def test_seed_for_new_user_populates_all_modules(user_id):
    db = MagicMock()
    today = date.today()
    welcome_id = uuid4()
    in_progress_id = uuid4()
    goal_id = uuid4()
    plan_id = uuid4()

    welcome_task = MagicMock(id=welcome_id)
    in_progress_task = MagicMock(id=in_progress_id)
    goal = MagicMock(id=goal_id)
    plan = MagicMock(id=plan_id)
    day = MagicMock(id=uuid4())

    with (
        patch("app.services.user_seed_service.BacklogTaskService") as backlog_cls,
        patch("app.services.user_seed_service.QuickNoteService") as notes_cls,
        patch("app.services.user_seed_service.YearlyGoalService") as goals_cls,
        patch("app.services.user_seed_service.MonthlyPlanService") as plans_cls,
        patch("app.services.user_seed_service.DailyProgressService") as daily_cls,
    ):
        backlog = backlog_cls.return_value
        backlog.create_task.side_effect = [welcome_task, MagicMock(), in_progress_task]
        daily_cls.return_value.get_day_by_date.return_value = day
        db.query.return_value.filter.return_value.first.return_value = None
        goals_cls.return_value.create_goal.return_value = goal
        plans_cls.return_value.create_plan.return_value = plan

        UserSeedService(db).seed_for_new_user(user_id)

        assert backlog.create_task.call_count == 3
        backlog.schedule_task.assert_any_call(user_id, str(welcome_id), ANY)
        backlog.schedule_task.assert_any_call(user_id, str(in_progress_id), ANY)
        assert notes_cls.return_value.create_note.call_count == 2
        goals_cls.return_value.create_goal.assert_called_once()
        plans_cls.return_value.create_plan.assert_called_once()
        plans_cls.return_value.create_task.assert_called_once_with(
            str(plan_id),
            ANY,
        )
        daily_cls.return_value.get_day_by_date.assert_called_once_with(user_id, today)
        db.add.assert_called_once()
        db.commit.assert_called()


def test_try_seed_new_user_swallows_errors(user_id):
    db = MagicMock()
    with patch(
        "app.services.user_seed_service.UserSeedService.seed_for_new_user",
        side_effect=RuntimeError("db down"),
    ):
        try_seed_new_user(db, user_id)
