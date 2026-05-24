"""backlog daily unification: links, progress, in_progress

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-05-24 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "backlog_tasks",
        sa.Column("progress", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "backlog_tasks",
        sa.Column("origin", sa.String(20), nullable=False, server_default="inbox"),
    )
    op.create_check_constraint(
        "ck_backlog_tasks_progress_range",
        "backlog_tasks",
        "progress >= 0 AND progress <= 100",
    )

    op.add_column(
        "daily_tasks",
        sa.Column(
            "backlog_task_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("backlog_tasks.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_daily_tasks_backlog_task_id", "daily_tasks", ["backlog_task_id"])

    op.create_table(
        "backlog_daily_links",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "backlog_task_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("backlog_tasks.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "daily_task_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("daily_tasks.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("plan_date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("daily_task_id", name="uq_backlog_daily_links_daily_task_id"),
        sa.UniqueConstraint(
            "backlog_task_id",
            "plan_date",
            name="uq_backlog_daily_links_backlog_plan_date",
        ),
    )
    op.create_index(
        "ix_backlog_daily_links_backlog_task_id",
        "backlog_daily_links",
        ["backlog_task_id"],
    )
    op.create_index("ix_backlog_daily_links_plan_date", "backlog_daily_links", ["plan_date"])

    # Backfill progress/status from legacy status
    op.execute(
        """
        UPDATE backlog_tasks
        SET progress = 100,
            status = 'done'
        WHERE status = 'done'
        """
    )
    op.execute(
        """
        UPDATE backlog_tasks
        SET progress = 0,
            status = 'pending'
        WHERE status IN ('pending', 'scheduled', 'cancelled')
        """
    )

    # Migrate existing daily_task_id into link table
    op.execute(
        """
        INSERT INTO backlog_daily_links (id, backlog_task_id, daily_task_id, plan_date, created_at)
        SELECT gen_random_uuid(), bt.id, bt.daily_task_id, dp.plan_date, COALESCE(bt.created_at, CURRENT_TIMESTAMP)
        FROM backlog_tasks bt
        JOIN daily_tasks dt ON dt.id = bt.daily_task_id
        JOIN daily_plans dp ON dp.id = dt.daily_plan_id
        WHERE bt.daily_task_id IS NOT NULL
        ON CONFLICT DO NOTHING
        """
    )
    op.execute(
        """
        UPDATE daily_tasks dt
        SET backlog_task_id = bt.id
        FROM backlog_tasks bt
        WHERE bt.daily_task_id = dt.id
        """
    )


def downgrade() -> None:
    op.drop_index("ix_backlog_daily_links_plan_date", table_name="backlog_daily_links")
    op.drop_index("ix_backlog_daily_links_backlog_task_id", table_name="backlog_daily_links")
    op.drop_table("backlog_daily_links")

    op.drop_index("ix_daily_tasks_backlog_task_id", table_name="daily_tasks")
    op.drop_column("daily_tasks", "backlog_task_id")

    op.drop_constraint("ck_backlog_tasks_progress_range", "backlog_tasks", type_="check")
    op.drop_column("backlog_tasks", "origin")
    op.drop_column("backlog_tasks", "progress")
