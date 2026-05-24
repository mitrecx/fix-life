"""add backlog tasks table

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-05-24 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "backlog_tasks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("context", sa.String(20), nullable=False, server_default="learning"),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("scheduled_date", sa.Date()),
        sa.Column("daily_task_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("daily_tasks.id", ondelete="SET NULL")),
        sa.Column("completed_at", sa.TIMESTAMP()),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.TIMESTAMP(), server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_backlog_tasks_user_id", "backlog_tasks", ["user_id"])
    op.create_index("ix_backlog_tasks_status", "backlog_tasks", ["status"])
    op.create_index("ix_backlog_tasks_context", "backlog_tasks", ["context"])
    op.create_index("ix_backlog_tasks_daily_task_id", "backlog_tasks", ["daily_task_id"])


def downgrade() -> None:
    op.drop_index("ix_backlog_tasks_daily_task_id", table_name="backlog_tasks")
    op.drop_index("ix_backlog_tasks_context", table_name="backlog_tasks")
    op.drop_index("ix_backlog_tasks_status", table_name="backlog_tasks")
    op.drop_index("ix_backlog_tasks_user_id", table_name="backlog_tasks")
    op.drop_table("backlog_tasks")
