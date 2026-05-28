"""rename daily_progress_days.plan_date to progress_date

Revision ID: u5r6s7t8u9v0
Revises: t4q5r6s7t8u9
Create Date: 2026-05-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "u5r6s7t8u9v0"
down_revision: Union[str, None] = "t4q5r6s7t8u9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "daily_progress_days",
        "plan_date",
        new_column_name="progress_date",
    )


def downgrade() -> None:
    op.alter_column(
        "daily_progress_days",
        "progress_date",
        new_column_name="plan_date",
    )
