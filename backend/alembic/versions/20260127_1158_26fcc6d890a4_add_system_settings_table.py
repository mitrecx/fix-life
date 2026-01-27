"""add_system_settings_table

Revision ID: 26fcc6d890a4
Revises: 5b3ecf618809
Create Date: 2026-01-27 11:58:34.173113

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '26fcc6d890a4'
down_revision: Union[str, None] = '5b3ecf618809'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create system_settings table
    op.create_table(
        'system_settings',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('show_daily_summary', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    # Create index for user_id
    op.create_index('ix_system_settings_user_id', 'system_settings', ['user_id'])


def downgrade() -> None:
    # Drop system_settings table
    op.drop_index('ix_system_settings_user_id', table_name='system_settings')
    op.drop_table('system_settings')
