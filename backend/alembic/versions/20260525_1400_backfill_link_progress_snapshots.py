"""backfill progress_after on backlog daily links

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-05-25 14:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    backlogs = conn.execute(sa.text("SELECT id, progress FROM backlog_tasks")).fetchall()

    for backlog_id, backlog_progress in backlogs:
        links = conn.execute(
            sa.text(
                """
                SELECT bdl.id, bdl.progress_after, dt.status AS daily_status
                FROM backlog_daily_links bdl
                JOIN daily_tasks dt ON dt.id = bdl.daily_task_id
                WHERE bdl.backlog_task_id = :backlog_id
                ORDER BY bdl.plan_date ASC
                """
            ),
            {"backlog_id": backlog_id},
        ).fetchall()

        if not links:
            continue

        last_backfill_id = None
        for link in reversed(links):
            if link.progress_after is not None:
                break
            if link.daily_status == "done":
                last_backfill_id = link.id
                break
        if last_backfill_id is None:
            for link in reversed(links):
                if link.progress_after is None:
                    last_backfill_id = link.id
                    break

        prev_after = 0
        for link in links:
            if link.progress_after is not None:
                prev_after = link.progress_after
                continue

            if last_backfill_id is not None and link.id == last_backfill_id:
                new_after = max(prev_after, backlog_progress or 0)
            else:
                new_after = prev_after

            conn.execute(
                sa.text(
                    "UPDATE backlog_daily_links SET progress_after = :after WHERE id = :id"
                ),
                {"after": new_after, "id": link.id},
            )
            prev_after = new_after


def downgrade() -> None:
    pass
