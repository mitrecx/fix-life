"""add weekly summaries table

Revision ID: 20260305_2128
Revises: 005
Create Date: 2026-03-05 21:28:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260305_2128'
down_revision: Union[str, None] = '005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'weekly_summaries',
        sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('week_number', sa.Integer(), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('stats', sa.JSON(), nullable=False),
        sa.Column('summary_text', sa.Text(), nullable=True),
        sa.Column('total_tasks', sa.Integer(), server_default='0', nullable=False),
        sa.Column('completed_tasks', sa.Integer(), server_default='0', nullable=False),
        sa.Column('completion_rate', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('auto_generated', sa.String(length=50), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for better query performance
    op.create_index('ix_weekly_summaries_user_id', 'weekly_summaries', ['user_id'], unique=False)
    op.create_index('ix_weekly_summaries_year_week', 'weekly_summaries', ['year', 'week_number'], unique=False)
    op.create_index('ix_weekly_summaries_start_date', 'weekly_summaries', ['start_date'], unique=False)

    # Create unique constraint to prevent duplicate weekly summaries
    op.create_unique_constraint('uq_weekly_summaries_user_year_week', 'weekly_summaries', ['user_id', 'year', 'week_number'])


def downgrade() -> None:
    op.drop_constraint('uq_weekly_summaries_user_year_week', 'weekly_summaries')
    op.drop_index('ix_weekly_summaries_start_date', table_name='weekly_summaries')
    op.drop_index('ix_weekly_summaries_year_week', table_name='weekly_summaries')
    op.drop_index('ix_weekly_summaries_user_id', table_name='weekly_summaries')
    op.drop_table('weekly_summaries')
