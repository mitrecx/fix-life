"""update daily plan fields - change mood to busyness_level, remove energy_level

Revision ID: 004
Revises: 003
Create Date: 2026-01-18

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade():
    # Create the busynesslevel enum type
    busynesslevel_enum = postgresql.ENUM(
        'very-free', 'free', 'moderate', 'busy', 'very-busy',
        name='busynesslevel',
        create_type=True
    )
    busynesslevel_enum.create(op.get_bind(), checkfirst=True)

    # Add busyness_level column (nullable first)
    op.add_column('daily_plans',
                  sa.Column('busyness_level',
                            sa.Enum('very-free', 'free', 'moderate', 'busy', 'very-busy',
                                    name='busynesslevel'),
                            nullable=True))

    # Copy mood data to busyness_level if desired (mapping old values to new ones)
    # For now, we'll just set it to NULL or a default value

    # Make busyness_level nullable
    op.alter_column('daily_plans', 'busyness_level',
                    nullable=True)

    # Drop mood column
    op.drop_column('daily_plans', 'mood')

    # Drop energy_level column
    op.drop_column('daily_plans', 'energy_level')


def downgrade():
    # Add back mood column
    mood_enum = postgresql.ENUM(
        'great', 'good', 'okay', 'bad', 'terrible',
        name='mood',
        create_type=True
    )
    mood_enum.create(op.get_bind(), checkfirst=True)

    op.add_column('daily_plans',
                  sa.Column('mood',
                            sa.Enum('great', 'good', 'okay', 'bad', 'terrible',
                                    name='mood'),
                            nullable=True))

    # Add back energy_level column
    op.add_column('daily_plans',
                  sa.Column('energy_level', sa.Integer(), nullable=True))

    # Drop busyness_level column
    op.drop_column('daily_plans', 'busyness_level')
