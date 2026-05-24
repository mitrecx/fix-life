"""add mcp api key ciphertext column

Revision ID: f7a8b9c0d1e2
Revises: 00f718b0c76c
Create Date: 2026-05-25 18:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f7a8b9c0d1e2"
down_revision: Union[str, None] = "00f718b0c76c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("mcp_api_keys", sa.Column("key_ciphertext", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("mcp_api_keys", "key_ciphertext")
