"""Add community and premium roles; gate quick notes by permission.

Revision ID: r2o3l4e5s6c7
Revises: q1n2o3t4e5s6
Create Date: 2026-05-25 12:00:00.000000
"""
from typing import Sequence, Union
import uuid

from alembic import op
from sqlalchemy import text

revision: str = "r2o3l4e5s6c7"
down_revision: Union[str, None] = "q1n2o3t4e5s6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

PERM_QUICK_NOTES_USE = uuid.UUID("a0000001-0000-4000-8000-000000000003")
ROLE_ADMIN = uuid.UUID("b0000001-0000-4000-8000-000000000001")
ROLE_COMMUNITY = uuid.UUID("b0000002-0000-4000-8000-000000000002")
ROLE_PREMIUM = uuid.UUID("b0000003-0000-4000-8000-000000000003")


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        text(
            "INSERT INTO roles (id, name, description) VALUES "
            "(:community_id, :community_name, :community_desc), "
            "(:premium_id, :premium_name, :premium_desc)"
        ),
        {
            "community_id": ROLE_COMMUNITY,
            "community_name": "community",
            "community_desc": "Default community member",
            "premium_id": ROLE_PREMIUM,
            "premium_name": "premium",
            "premium_desc": "Premium member with extended features",
        },
    )
    conn.execute(
        text(
            "INSERT INTO permissions (id, code, description) "
            "VALUES (:pid, :code, :description)"
        ),
        {
            "pid": PERM_QUICK_NOTES_USE,
            "code": "quick_notes:use",
            "description": "Create and manage quick notes",
        },
    )
    conn.execute(
        text(
            "INSERT INTO role_permissions (role_id, permission_id) VALUES "
            "(:premium_role, :perm), (:admin_role, :perm)"
        ),
        {
            "premium_role": ROLE_PREMIUM,
            "admin_role": ROLE_ADMIN,
            "perm": PERM_QUICK_NOTES_USE,
        },
    )
    conn.execute(
        text(
            "INSERT INTO user_roles (user_id, role_id) "
            "SELECT u.id, :community_role "
            "FROM users u "
            "WHERE NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id)"
        ),
        {"community_role": ROLE_COMMUNITY},
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        text("DELETE FROM user_roles WHERE role_id IN (:community, :premium)"),
        {"community": ROLE_COMMUNITY, "premium": ROLE_PREMIUM},
    )
    conn.execute(
        text(
            "DELETE FROM role_permissions "
            "WHERE permission_id = :perm AND role_id IN (:premium, :admin)"
        ),
        {"perm": PERM_QUICK_NOTES_USE, "premium": ROLE_PREMIUM, "admin": ROLE_ADMIN},
    )
    conn.execute(
        text("DELETE FROM permissions WHERE id = :pid"),
        {"pid": PERM_QUICK_NOTES_USE},
    )
    conn.execute(
        text("DELETE FROM roles WHERE id IN (:community, :premium)"),
        {"community": ROLE_COMMUNITY, "premium": ROLE_PREMIUM},
    )
