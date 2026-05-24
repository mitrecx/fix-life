import enum
from datetime import datetime, date
from sqlalchemy import Column, String, Enum, ForeignKey, Text, DateTime, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.db.base import Base
from app.models.task_context import TaskContext
from app.models.task_priority import TaskPriority


class BacklogTaskStatus(str, enum.Enum):
    PENDING = "pending"
    SCHEDULED = "scheduled"
    DONE = "done"
    CANCELLED = "cancelled"


class BacklogTask(Base):
    __tablename__ = "backlog_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    context = Column(
        Enum(TaskContext, values_callable=lambda x: [e.value for e in x]),
        default=TaskContext.LEARNING,
        nullable=False,
    )
    priority = Column(
        Enum(TaskPriority, values_callable=lambda x: [e.value for e in x]),
        default=TaskPriority.MEDIUM,
        nullable=False,
    )
    status = Column(
        Enum(BacklogTaskStatus, values_callable=lambda x: [e.value for e in x]),
        default=BacklogTaskStatus.PENDING,
        nullable=False,
    )
    scheduled_date = Column(Date)
    daily_task_id = Column(UUID(as_uuid=True), ForeignKey("daily_tasks.id", ondelete="SET NULL"))
    completed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="backlog_tasks")
    daily_task = relationship("DailyTask", foreign_keys=[daily_task_id])

    def __repr__(self):
        return f"<BacklogTask {self.title} - {self.status}>"
