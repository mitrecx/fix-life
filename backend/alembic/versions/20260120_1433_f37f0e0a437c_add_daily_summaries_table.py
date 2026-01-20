"""add daily summaries table

Revision ID: f37f0e0a437c
Revises: 20260118_2222
Create Date: 2026-01-20 14:33:35.073150

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f37f0e0a437c'
down_revision: Union[str, None] = '20260118_2222'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create daily_summaries table
    op.create_table(
        'daily_summaries',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('daily_plan_id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('summary_type', sa.String(length=20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['daily_plan_id'], ['daily_plans.id'], name=op.f('fk_daily_summaries_daily_plan_id_daily_plans'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_daily_summaries_user_id_users'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_daily_summaries'))
    )
    op.create_index(op.f('ix_daily_summaries_daily_plan_id'), 'daily_summaries', ['daily_plan_id'], unique=True)
    op.create_index(op.f('ix_daily_summaries_user_id'), 'daily_summaries', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_daily_summaries_user_id'), table_name='daily_summaries')
    op.drop_index(op.f('ix_daily_summaries_daily_plan_id'), table_name='daily_summaries')
    op.drop_table('daily_summaries')
