"""remove busyness_level field

Revision ID: 005
Revises: 26fcc6d890a4
Create Date: 2026-03-05

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '005'
down_revision = '26fcc6d890a4'
branch_labels = None
depends_on = None


def upgrade():
    # Drop busyness_level column
    op.drop_column('daily_plans', 'busyness_level')

    # Drop the busynesslevel enum type
    op.execute('DROP TYPE IF EXISTS busynesslevel')


def downgrade():
    # Recreate the busynesslevel enum type
    busynesslevel_enum = postgresql.ENUM(
        'very-free', 'free', 'moderate', 'busy', 'very-busy',
        name='busynesslevel',
        create_type=True
    )
    busynesslevel_enum.create(op.get_bind(), checkfirst=True)

    # Add back busyness_level column
    op.add_column('daily_plans',
                  sa.Column('busyness_level',
                            sa.Enum('very-free', 'free', 'moderate', 'busy', 'very-busy',
                                    name='busynesslevel'),
                            nullable=True))
