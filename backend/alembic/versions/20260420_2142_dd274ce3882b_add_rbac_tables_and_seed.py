"""add rbac tables and seed

Revision ID: dd274ce3882b
Revises: 20260305_2200
Create Date: 2026-04-20 21:42:20.297648

"""
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "dd274ce3882b"
down_revision: Union[str, None] = "20260305_2200"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

PERM_SYSTEM_STATUS = uuid.UUID("a0000001-0000-4000-8000-000000000001")
ROLE_ADMIN = uuid.UUID("b0000001-0000-4000-8000-000000000001")


def upgrade() -> None:
    op.create_table(
        "permissions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("code", sa.String(100), nullable=False, unique=True),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
    )
    op.create_table(
        "roles",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("name", sa.String(50), nullable=False, unique=True),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
    )
    op.create_table(
        "role_permissions",
        sa.Column(
            "role_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("roles.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "permission_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("permissions.id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )
    op.create_table(
        "user_roles",
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "role_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("roles.id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )

    conn = op.get_bind()
    conn.execute(
        text(
            "INSERT INTO permissions (id, code, description) "
            "VALUES (:pid, :code, :description)"
        ),
        {
            "pid": PERM_SYSTEM_STATUS,
            "code": "system_status:read",
            "description": "View system dependency status",
        },
    )
    conn.execute(
        text("INSERT INTO roles (id, name, description) VALUES (:rid, :name, :description)"),
        {
            "rid": ROLE_ADMIN,
            "name": "admin",
            "description": "Administrator",
        },
    )
    conn.execute(
        text(
            "INSERT INTO role_permissions (role_id, permission_id) "
            "VALUES (:role_id, :permission_id)"
        ),
        {"role_id": ROLE_ADMIN, "permission_id": PERM_SYSTEM_STATUS},
    )
    conn.execute(
        text(
            "INSERT INTO user_roles (user_id, role_id) "
            "SELECT u.id, :rid FROM users u "
            "WHERE u.username = 'Mitre' "
            "AND NOT EXISTS ("
            "SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = :rid)"
        ),
        {"rid": ROLE_ADMIN},
    )


def downgrade() -> None:
    op.drop_table("user_roles")
    op.drop_table("role_permissions")
    op.drop_table("roles")
    op.drop_table("permissions")
