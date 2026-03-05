"""add weekly summary notification settings

Revision ID: 20260305_2200
Revises: 20260305_2128
Create Date: 2026-03-05 22:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20260305_2200'
down_revision = '20260305_2128'
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns to system_settings table
    op.add_column('system_settings', sa.Column('weekly_summary_email_enabled', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('system_settings', sa.Column('weekly_summary_email', sa.String(), nullable=True))
    op.add_column('system_settings', sa.Column('weekly_summary_feishu_enabled', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('system_settings', sa.Column('feishu_app_id', sa.String(), nullable=True))
    op.add_column('system_settings', sa.Column('feishu_app_secret', sa.String(), nullable=True))
    op.add_column('system_settings', sa.Column('feishu_chat_id', sa.String(), nullable=True))


def downgrade():
    # Remove columns from system_settings table
    op.drop_column('system_settings', 'feishu_chat_id')
    op.drop_column('system_settings', 'feishu_app_secret')
    op.drop_column('system_settings', 'feishu_app_id')
    op.drop_column('system_settings', 'weekly_summary_feishu_enabled')
    op.drop_column('system_settings', 'weekly_summary_email')
    op.drop_column('system_settings', 'weekly_summary_email_enabled')
