"""Add created_at and updated_at to users table

Revision ID: 20260118_1533
Revises: 004
Create Date: 2026-01-18 15:33:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '20260118_1533'
down_revision: Union[str, None] = '004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    # Add created_at column with server default
    op.add_column('users', sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))

    # Add updated_at column with server default
    op.add_column('users', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True))

    # Update any existing NULL is_active values to True before making column NOT NULL
    op.execute("UPDATE users SET is_active = TRUE WHERE is_active IS NULL")

    # Make is_active NOT NULL
    op.alter_column('users', 'is_active', nullable=False)


def downgrade() -> None:
    # Revert is_active to nullable
    op.alter_column('users', 'is_active', nullable=True)

    # Remove updated_at column
    op.drop_column('users', 'updated_at')

    # Remove created_at column
    op.drop_column('users', 'created_at')
