"""add_avatar_data_columns

Revision ID: 5b3ecf618809
Revises: f37f0e0a437c
Create Date: 2026-01-20 23:43:45.782536

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5b3ecf618809'
down_revision: Union[str, None] = 'f37f0e0a437c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add avatar_data column (LargeBinary)
    op.add_column('users', sa.Column('avatar_data', sa.LargeBinary(), nullable=True))
    # Add avatar_mime_type column (String)
    op.add_column('users', sa.Column('avatar_mime_type', sa.String(length=50), nullable=True))


def downgrade() -> None:
    # Drop columns in reverse order
    op.drop_column('users', 'avatar_mime_type')
    op.drop_column('users', 'avatar_data')
