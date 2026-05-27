"""rename daily plan tables to daily progress (Phase 5)

Revision ID: s3p4h5a6s7e8
Revises: r2o3l4e5s6c7
Create Date: 2026-05-25 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "s3p4h5a6s7e8"
down_revision: Union[str, None] = "r2o3l4e5s6c7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.rename_table("daily_plans", "daily_progress_days")
    op.rename_table("daily_tasks", "daily_progress_entries")

    op.alter_column(
        "daily_progress_entries",
        "daily_plan_id",
        new_column_name="daily_progress_day_id",
    )
    op.alter_column(
        "daily_summaries",
        "daily_plan_id",
        new_column_name="daily_progress_day_id",
    )

    op.execute("ALTER INDEX ix_daily_plans_user_date RENAME TO ix_daily_progress_days_user_date")
    op.execute(
        "ALTER INDEX ix_daily_plans_monthly_plan_id RENAME TO ix_daily_progress_days_monthly_plan_id"
    )
    op.execute("ALTER INDEX ix_daily_tasks_plan_id RENAME TO ix_daily_progress_entries_day_id")
    op.execute("ALTER INDEX ix_daily_tasks_status RENAME TO ix_daily_progress_entries_status")
    op.execute("ALTER INDEX ix_daily_tasks_priority RENAME TO ix_daily_progress_entries_priority")
    op.execute("ALTER INDEX ix_daily_tasks_time_slot RENAME TO ix_daily_progress_entries_time_slot")
    op.execute("ALTER INDEX ix_daily_tasks_context RENAME TO ix_daily_progress_entries_context")
    op.execute(
        "ALTER INDEX ix_daily_summaries_daily_plan_id RENAME TO ix_daily_summaries_daily_progress_day_id"
    )
    op.execute(
        "ALTER INDEX ix_daily_tasks_backlog_task_id RENAME TO ix_daily_progress_entries_backlog_task_id"
    )

    op.execute(
        """
        CREATE VIEW daily_plans AS
        SELECT * FROM daily_progress_days
        """
    )
    op.execute(
        """
        CREATE VIEW daily_tasks AS
        SELECT
            id,
            daily_progress_day_id AS daily_plan_id,
            backlog_task_id,
            title,
            description,
            priority,
            status,
            context,
            estimated_minutes,
            actual_minutes,
            time_slot,
            created_at,
            updated_at
        FROM daily_progress_entries
        """
    )


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS daily_tasks")
    op.execute("DROP VIEW IF EXISTS daily_plans")

    op.execute(
        "ALTER INDEX ix_daily_progress_entries_backlog_task_id RENAME TO ix_daily_tasks_backlog_task_id"
    )
    op.execute(
        "ALTER INDEX ix_daily_summaries_daily_progress_day_id RENAME TO ix_daily_summaries_daily_plan_id"
    )
    op.execute("ALTER INDEX ix_daily_progress_entries_context RENAME TO ix_daily_tasks_context")
    op.execute("ALTER INDEX ix_daily_progress_entries_time_slot RENAME TO ix_daily_tasks_time_slot")
    op.execute("ALTER INDEX ix_daily_progress_entries_priority RENAME TO ix_daily_tasks_priority")
    op.execute("ALTER INDEX ix_daily_progress_entries_status RENAME TO ix_daily_tasks_status")
    op.execute("ALTER INDEX ix_daily_progress_entries_day_id RENAME TO ix_daily_tasks_plan_id")
    op.execute(
        "ALTER INDEX ix_daily_progress_days_monthly_plan_id RENAME TO ix_daily_plans_monthly_plan_id"
    )
    op.execute("ALTER INDEX ix_daily_progress_days_user_date RENAME TO ix_daily_plans_user_date")

    op.alter_column(
        "daily_summaries",
        "daily_progress_day_id",
        new_column_name="daily_plan_id",
    )
    op.alter_column(
        "daily_progress_entries",
        "daily_progress_day_id",
        new_column_name="daily_plan_id",
    )

    op.rename_table("daily_progress_entries", "daily_tasks")
    op.rename_table("daily_progress_days", "daily_plans")
