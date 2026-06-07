"""Add WeChat mini program login fields to users.

Revision ID: v6w7x8y9z0a1
Revises: u5r6s7t8u9v0
Create Date: 2026-06-07
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "v6w7x8y9z0a1"
down_revision: Union[str, None] = "u5r6s7t8u9v0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("wechat_openid", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("wechat_unionid", sa.String(length=64), nullable=True))
    op.alter_column("users", "hashed_password", existing_type=sa.String(length=255), nullable=True)
    op.create_index("ix_users_wechat_openid", "users", ["wechat_openid"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_wechat_openid", table_name="users")
    op.alter_column("users", "hashed_password", existing_type=sa.String(length=255), nullable=False)
    op.drop_column("users", "wechat_unionid")
    op.drop_column("users", "wechat_openid")
