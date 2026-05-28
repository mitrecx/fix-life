import enum
from datetime import datetime, date
from sqlalchemy import Column, String, Integer, Date, Enum, ForeignKey, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.db.base import Base
from app.models.task_context import TaskContext


class SummaryType(str, enum.Enum):
    DAILY = "daily"  # 日常总结
    SMALL = "small"  # 小总结
    LARGE = "large"  # 大总结


class DailyProgressEntryPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class DailyProgressEntryStatus(str, enum.Enum):
    TODO = "todo"
    IN_PROGRESS = "in-progress"
    DONE = "done"
    CANCELLED = "cancelled"


class DailyProgressDay(Base):
    """One user's daily progress day container (每日进度)."""

    __tablename__ = "daily_progress_days"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    monthly_plan_id = Column(UUID(as_uuid=True), ForeignKey("monthly_plans.id", ondelete="SET NULL"))
    progress_date = Column(Date, nullable=False)
    title = Column(String(200))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="daily_progress_days")
    monthly_plan = relationship("MonthlyPlan", back_populates="daily_progress_days")
    daily_progress_entries = relationship(
        "DailyProgressEntry",
        back_populates="daily_progress_day",
        cascade="all, delete-orphan",
    )
    daily_summary = relationship("DailySummary", uselist=False, cascade="all, delete-orphan")

    @property
    def total_tasks(self) -> int:
        return len(self.daily_progress_entries)

    @property
    def completed_tasks(self) -> int:
        return len(
            [
                entry
                for entry in self.daily_progress_entries
                if entry.status == DailyProgressEntryStatus.DONE
            ]
        )

    @property
    def completion_rate(self) -> float:
        if self.total_tasks == 0:
            return 0.0
        return round(self.completed_tasks / self.total_tasks * 100, 2)

    def __repr__(self):
        return f"<DailyProgressDay {self.progress_date}: {self.title}>"


class DailyProgressEntry(Base):
    __tablename__ = "daily_progress_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    daily_progress_day_id = Column(
        UUID(as_uuid=True),
        ForeignKey("daily_progress_days.id", ondelete="CASCADE"),
        nullable=False,
    )
    backlog_task_id = Column(
        UUID(as_uuid=True),
        ForeignKey("backlog_tasks.id", ondelete="SET NULL"),
        nullable=True,
    )
    title = Column(String(200), nullable=False)
    description = Column(Text)
    priority = Column(
        Enum(DailyProgressEntryPriority, values_callable=lambda x: [e.value for e in x]),
        default=DailyProgressEntryPriority.MEDIUM,
    )
    status = Column(
        Enum(DailyProgressEntryStatus, values_callable=lambda x: [e.value for e in x]),
        default=DailyProgressEntryStatus.TODO,
    )
    context = Column(
        Enum(TaskContext, values_callable=lambda x: [e.value for e in x]),
        default=TaskContext.LEARNING,
        nullable=False,
    )
    estimated_minutes = Column(Integer)
    actual_minutes = Column(Integer, default=0)
    time_slot = Column(String(50))  # e.g., "morning", "afternoon", "evening"
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    daily_progress_day = relationship("DailyProgressDay", back_populates="daily_progress_entries")
    backlog_link = relationship(
        "BacklogDailyLink",
        back_populates="daily_progress_entry",
        uselist=False,
        passive_deletes=True,
    )

    def __repr__(self):
        return f"<DailyProgressEntry {self.title} - {self.status}>"


class DailySummary(Base):
    __tablename__ = "daily_summaries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    daily_progress_day_id = Column(
        UUID(as_uuid=True),
        ForeignKey("daily_progress_days.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    summary_type = Column(Enum(SummaryType, values_callable=lambda x: [e.value for e in x]), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    daily_progress_day = relationship("DailyProgressDay")
    user = relationship("User")

    def __repr__(self):
        return f"<DailySummary {self.daily_progress_day_id}: {self.summary_type}>"
