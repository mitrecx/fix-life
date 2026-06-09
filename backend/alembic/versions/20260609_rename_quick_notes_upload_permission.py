"""Rename quick notes permission to image upload only.

Revision ID: 20260609_qn_upload
Revises: w7x8y9z0a1b2
Create Date: 2026-06-09
"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = "20260609_qn_upload"
down_revision: Union[str, None] = "w7x8y9z0a1b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        text(
            "UPDATE permissions "
            "SET code = :new_code, description = :new_desc "
            "WHERE code = :old_code"
        ),
        {
            "old_code": "quick_notes:use",
            "new_code": "quick_notes:upload_image",
            "new_desc": "Upload images in quick notes",
        },
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        text(
            "UPDATE permissions "
            "SET code = :new_code, description = :new_desc "
            "WHERE code = :old_code"
        ),
        {
            "old_code": "quick_notes:upload_image",
            "new_code": "quick_notes:use",
            "new_desc": "Create and manage quick notes",
        },
    )
