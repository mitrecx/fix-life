"""add user avatar and bio

Revision ID: 20260118_2222
Revises: 20260118_1546
Create Date: 2026-01-18 22:22:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260118_2222'
down_revision: Union[str, None] = '20260118_1546'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('avatar_url', sa.String(length=500), nullable=True))
    op.add_column('users', sa.Column('bio', sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'bio')
    op.drop_column('users', 'avatar_url')
