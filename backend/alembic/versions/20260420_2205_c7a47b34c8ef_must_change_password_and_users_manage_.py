"""must change password and users manage permission

Revision ID: c7a47b34c8ef
Revises: dd274ce3882b
Create Date: 2026-04-20 22:05:14.158067

"""
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = "c7a47b34c8ef"
down_revision: Union[str, None] = "dd274ce3882b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

PERM_USERS_MANAGE = uuid.UUID("a0000001-0000-4000-8000-000000000002")
ROLE_ADMIN = uuid.UUID("b0000001-0000-4000-8000-000000000001")


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "must_change_password",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    conn = op.get_bind()
    conn.execute(
        text(
            "INSERT INTO permissions (id, code, description) "
            "VALUES (:pid, :code, :description)"
        ),
        {
            "pid": PERM_USERS_MANAGE,
            "code": "users:manage",
            "description": "Manage users and roles",
        },
    )
    conn.execute(
        text(
            "INSERT INTO role_permissions (role_id, permission_id) "
            "VALUES (:role_id, :permission_id)"
        ),
        {"role_id": ROLE_ADMIN, "permission_id": PERM_USERS_MANAGE},
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        text(
            "DELETE FROM role_permissions "
            "WHERE role_id = :role_id AND permission_id = :permission_id"
        ),
        {"role_id": ROLE_ADMIN, "permission_id": PERM_USERS_MANAGE},
    )
    conn.execute(
        text("DELETE FROM permissions WHERE id = :pid"),
        {"pid": PERM_USERS_MANAGE},
    )
    op.drop_column("users", "must_change_password")
