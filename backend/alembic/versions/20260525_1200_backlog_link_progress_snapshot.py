"""backlog daily link progress snapshot

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-05-25 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "backlog_daily_links",
        sa.Column("progress_after", sa.Integer(), nullable=True),
    )
    op.create_check_constraint(
        "ck_backlog_daily_links_progress_after_range",
        "backlog_daily_links",
        "progress_after IS NULL OR (progress_after >= 0 AND progress_after <= 100)",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_backlog_daily_links_progress_after_range",
        "backlog_daily_links",
        type_="check",
    )
    op.drop_column("backlog_daily_links", "progress_after")
