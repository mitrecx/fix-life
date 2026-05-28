from datetime import datetime, date
import uuid

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class BacklogDailyLink(Base):
    __tablename__ = "backlog_daily_links"
    __table_args__ = (
        UniqueConstraint("daily_task_id", name="uq_backlog_daily_links_daily_task_id"),
        UniqueConstraint(
            "backlog_task_id",
            "plan_date",
            name="uq_backlog_daily_links_backlog_plan_date",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    backlog_task_id = Column(
        UUID(as_uuid=True),
        ForeignKey("backlog_tasks.id", ondelete="CASCADE"),
        nullable=False,
    )
    daily_task_id = Column(
        UUID(as_uuid=True),
            ForeignKey("daily_progress_entries.id", ondelete="CASCADE"),
        nullable=False,
    )
    plan_date = Column(Date, nullable=False)
    progress_after = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    backlog_task = relationship("BacklogTask", back_populates="daily_links")
    daily_progress_entry = relationship("DailyProgressEntry", back_populates="backlog_link")
