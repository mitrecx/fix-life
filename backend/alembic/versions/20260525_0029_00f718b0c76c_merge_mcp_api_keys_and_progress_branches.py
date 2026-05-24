"""merge mcp api keys and progress branches

Revision ID: 00f718b0c76c
Revises: e1f2a3b4c5d6, f6a7b8c9d0e1
Create Date: 2026-05-25 00:29:20.548117

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '00f718b0c76c'
down_revision: Union[str, None] = ('e1f2a3b4c5d6', 'f6a7b8c9d0e1')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
