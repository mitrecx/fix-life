"""add task context to daily and monthly tasks

Revision ID: a1b2c3d4e5f6
Revises: c7a47b34c8ef
Create Date: 2026-05-24 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "c7a47b34c8ef"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "daily_tasks",
        sa.Column("context", sa.String(20), nullable=False, server_default="learning"),
    )
    op.add_column(
        "monthly_tasks",
        sa.Column("context", sa.String(20), nullable=False, server_default="learning"),
    )
    op.create_index("ix_daily_tasks_context", "daily_tasks", ["context"])
    op.create_index("ix_monthly_tasks_context", "monthly_tasks", ["context"])


def downgrade() -> None:
    op.drop_index("ix_monthly_tasks_context", table_name="monthly_tasks")
    op.drop_index("ix_daily_tasks_context", table_name="daily_tasks")
    op.drop_column("monthly_tasks", "context")
    op.drop_column("daily_tasks", "context")
