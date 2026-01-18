"""Add daily plans and tasks

Revision ID: 003
Revises: 002
Create Date: 2024-01-18 05:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create daily_plans table
    op.create_table(
        'daily_plans',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('monthly_plan_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('monthly_plans.id', ondelete='SET NULL')),
        sa.Column('plan_date', sa.Date(), nullable=False),
        sa.Column('title', sa.String(200)),
        sa.Column('mood', sa.String(20)),
        sa.Column('energy_level', sa.Integer()),
        sa.Column('notes', sa.Text()),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_daily_plans_user_date', 'daily_plans', ['user_id', 'plan_date'], unique=True)
    op.create_index('ix_daily_plans_monthly_plan_id', 'daily_plans', ['monthly_plan_id'])

    # Create daily_tasks table
    op.create_table(
        'daily_tasks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('daily_plan_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('daily_plans.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('priority', sa.String(10), default='medium'),
        sa.Column('status', sa.String(20), default='todo'),
        sa.Column('estimated_minutes', sa.Integer()),
        sa.Column('actual_minutes', sa.Integer(), default=0),
        sa.Column('time_slot', sa.String(50)),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_daily_tasks_plan_id', 'daily_tasks', ['daily_plan_id'])
    op.create_index('ix_daily_tasks_status', 'daily_tasks', ['status'])
    op.create_index('ix_daily_tasks_priority', 'daily_tasks', ['priority'])
    op.create_index('ix_daily_tasks_time_slot', 'daily_tasks', ['time_slot'])


def downgrade() -> None:
    op.drop_index('ix_daily_tasks_time_slot', table_name='daily_tasks')
    op.drop_index('ix_daily_tasks_priority', table_name='daily_tasks')
    op.drop_index('ix_daily_tasks_status', table_name='daily_tasks')
    op.drop_index('ix_daily_tasks_plan_id', table_name='daily_tasks')
    op.drop_table('daily_tasks')

    op.drop_index('ix_daily_plans_monthly_plan_id', table_name='daily_plans')
    op.drop_index('ix_daily_plans_user_date', table_name='daily_plans')
    op.drop_table('daily_plans')
