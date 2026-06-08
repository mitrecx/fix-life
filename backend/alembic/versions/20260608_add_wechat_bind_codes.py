"""add wechat_bind_codes table

Revision ID: 20260608_wechat_bind
Revises: 20260607_wechat_login
Create Date: 2026-06-08
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "w7x8y9z0a1b2"
down_revision = "v6w7x8y9z0a1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "wechat_bind_codes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code", sa.String(length=6), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_wechat_bind_codes_user_id"), "wechat_bind_codes", ["user_id"], unique=False)
    op.create_index(op.f("ix_wechat_bind_codes_code"), "wechat_bind_codes", ["code"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_wechat_bind_codes_code"), table_name="wechat_bind_codes")
    op.drop_index(op.f("ix_wechat_bind_codes_user_id"), table_name="wechat_bind_codes")
    op.drop_table("wechat_bind_codes")
