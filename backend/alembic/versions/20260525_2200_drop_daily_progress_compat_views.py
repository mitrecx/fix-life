"""drop daily progress DB compat views

Revision ID: t4q5r6s7t8u9
Revises: s3p4h5a6s7e8
Create Date: 2026-05-25 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "t4q5r6s7t8u9"
down_revision: Union[str, None] = "s3p4h5a6s7e8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("DROP VIEW IF EXISTS daily_tasks")
    op.execute("DROP VIEW IF EXISTS daily_plans")


def downgrade() -> None:
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
