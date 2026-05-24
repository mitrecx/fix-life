"""add quick notes table

Revision ID: q1n2o3t4e5s6
Revises: h8i9j0k1l2m3
Create Date: 2026-05-24 23:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "q1n2o3t4e5s6"
down_revision: Union[str, None] = "h8i9j0k1l2m3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "quick_notes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_quick_notes_user_id", "quick_notes", ["user_id"])
    op.create_index("ix_quick_notes_user_created", "quick_notes", ["user_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_quick_notes_user_created", table_name="quick_notes")
    op.drop_index("ix_quick_notes_user_id", table_name="quick_notes")
    op.drop_table("quick_notes")
