"""add priority to backlog tasks

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-05-24 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "backlog_tasks",
        sa.Column("priority", sa.String(20), nullable=False, server_default="medium"),
    )
    op.create_index("ix_backlog_tasks_priority", "backlog_tasks", ["priority"])


def downgrade() -> None:
    op.drop_index("ix_backlog_tasks_priority", table_name="backlog_tasks")
    op.drop_column("backlog_tasks", "priority")
