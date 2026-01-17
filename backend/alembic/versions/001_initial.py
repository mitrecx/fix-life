"""Initial migration

Revision ID: 001
Revises:
Create Date: 2024-01-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('username', sa.String(50), nullable=False),
        sa.Column('email', sa.String(100), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(100)),
        sa.Column('is_active', sa.Boolean(), default=True),
    )
    op.create_index('ix_users_id', 'users', ['id'])
    op.create_index('ix_users_username', 'users', ['username'], unique=True)
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # Create yearly_goals table
    op.create_table(
        'yearly_goals',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('color', sa.String(7)),
        sa.Column('target_value', sa.Numeric(10, 2), nullable=False),
        sa.Column('current_value', sa.Numeric(10, 2), default=0),
        sa.Column('unit', sa.String(20)),
        sa.Column('status', sa.String(20), default='pending'),
        sa.Column('start_date', sa.Date()),
        sa.Column('end_date', sa.Date()),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_yearly_goals_user_year', 'yearly_goals', ['user_id', 'year'])
    op.create_index('ix_yearly_goals_category', 'yearly_goals', ['category'])

    # Create monthly_milestones table
    op.create_table(
        'monthly_milestones',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('yearly_goal_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('yearly_goals.id', ondelete='CASCADE'), nullable=False),
        sa.Column('month', sa.Integer(), nullable=False),
        sa.Column('target_value', sa.Numeric(10, 2), nullable=False),
        sa.Column('achieved_value', sa.Numeric(10, 2), default=0),
        sa.Column('note', sa.Text()),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_monthly_milestones_goal_month', 'monthly_milestones', ['yearly_goal_id', 'month'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_monthly_milestones_goal_month', table_name='monthly_milestones')
    op.drop_table('monthly_milestones')

    op.drop_index('ix_yearly_goals_category', table_name='yearly_goals')
    op.drop_index('ix_yearly_goals_user_year', table_name='yearly_goals')
    op.drop_table('yearly_goals')

    op.drop_index('ix_users_email', table_name='users')
    op.drop_index('ix_users_username', table_name='users')
    op.drop_index('ix_users_id', table_name='users')
    op.drop_table('users')
