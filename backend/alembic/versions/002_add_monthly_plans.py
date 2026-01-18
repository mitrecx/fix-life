"""Add monthly plans and tasks

Revision ID: 002
Revises: 001
Create Date: 2024-01-18 04:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create monthly_plans table
    op.create_table(
        'monthly_plans',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('yearly_goal_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('yearly_goals.id', ondelete='SET NULL')),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('month', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(200)),
        sa.Column('focus_areas', postgresql.ARRAY(sa.String()), default=list),
        sa.Column('notes', sa.Text()),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_monthly_plans_user_year_month', 'monthly_plans', ['user_id', 'year', 'month'], unique=True)
    op.create_index('ix_monthly_plans_yearly_goal_id', 'monthly_plans', ['yearly_goal_id'])

    # Create monthly_tasks table
    op.create_table(
        'monthly_tasks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('monthly_plan_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('monthly_plans.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('priority', sa.String(10), default='medium'),
        sa.Column('status', sa.String(20), default='todo'),
        sa.Column('due_date', sa.Date()),
        sa.Column('estimated_hours', sa.Numeric(5, 2)),
        sa.Column('actual_hours', sa.Numeric(5, 2), default=0),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_monthly_tasks_plan_id', 'monthly_tasks', ['monthly_plan_id'])
    op.create_index('ix_monthly_tasks_status', 'monthly_tasks', ['status'])
    op.create_index('ix_monthly_tasks_priority', 'monthly_tasks', ['priority'])


def downgrade() -> None:
    op.drop_index('ix_monthly_tasks_priority', table_name='monthly_tasks')
    op.drop_index('ix_monthly_tasks_status', table_name='monthly_tasks')
    op.drop_index('ix_monthly_tasks_plan_id', table_name='monthly_tasks')
    op.drop_table('monthly_tasks')

    op.drop_index('ix_monthly_plans_yearly_goal_id', table_name='monthly_plans')
    op.drop_index('ix_monthly_plans_user_year_month', table_name='monthly_plans')
    op.drop_table('monthly_plans')
