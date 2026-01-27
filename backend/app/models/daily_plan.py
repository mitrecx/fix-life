import enum
from datetime import datetime, date
from sqlalchemy import Column, String, Integer, Date, Enum, ForeignKey, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.db.base import Base


class SummaryType(str, enum.Enum):
    DAILY = "daily"  # 日常总结
    SMALL = "small"  # 小总结
    LARGE = "large"  # 大总结


class DailyTaskPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class DailyTaskStatus(str, enum.Enum):
    TODO = "todo"
    IN_PROGRESS = "in-progress"
    DONE = "done"
    CANCELLED = "cancelled"


class BusynessLevel(str, enum.Enum):
    VERY_FREE = "very-free"
    FREE = "free"
    MODERATE = "moderate"
    BUSY = "busy"
    VERY_BUSY = "very-busy"


class DailyPlan(Base):
    __tablename__ = "daily_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    monthly_plan_id = Column(UUID(as_uuid=True), ForeignKey("monthly_plans.id", ondelete="SET NULL"))
    plan_date = Column(Date, nullable=False)
    title = Column(String(200))
    busyness_level = Column(Enum(BusynessLevel, values_callable=lambda x: [e.value for e in x]))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="daily_plans")
    monthly_plan = relationship("MonthlyPlan", back_populates="daily_plans")
    daily_tasks = relationship("DailyTask", back_populates="daily_plan", cascade="all, delete-orphan")
    daily_summary = relationship("DailySummary", uselist=False, cascade="all, delete-orphan")

    @property
    def total_tasks(self) -> int:
        return len(self.daily_tasks)

    @property
    def completed_tasks(self) -> int:
        return len([task for task in self.daily_tasks if task.status == DailyTaskStatus.DONE])

    @property
    def completion_rate(self) -> float:
        if self.total_tasks == 0:
            return 0.0
        return round(self.completed_tasks / self.total_tasks * 100, 2)

    def __repr__(self):
        return f"<DailyPlan {self.plan_date}: {self.title}>"


class DailyTask(Base):
    __tablename__ = "daily_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    daily_plan_id = Column(UUID(as_uuid=True), ForeignKey("daily_plans.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    priority = Column(Enum(DailyTaskPriority, values_callable=lambda x: [e.value for e in x]), default=DailyTaskPriority.MEDIUM)
    status = Column(Enum(DailyTaskStatus, values_callable=lambda x: [e.value for e in x]), default=DailyTaskStatus.TODO)
    estimated_minutes = Column(Integer)
    actual_minutes = Column(Integer, default=0)
    time_slot = Column(String(50))  # e.g., "morning", "afternoon", "evening"
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    daily_plan = relationship("DailyPlan", back_populates="daily_tasks")

    def __repr__(self):
        return f"<DailyTask {self.title} - {self.status}>"


class DailySummary(Base):
    __tablename__ = "daily_summaries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    daily_plan_id = Column(UUID(as_uuid=True), ForeignKey("daily_plans.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    summary_type = Column(Enum(SummaryType, values_callable=lambda x: [e.value for e in x]), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    daily_plan = relationship("DailyPlan")
    user = relationship("User")

    def __repr__(self):
        return f"<DailySummary {self.daily_plan_id}: {self.summary_type}>"
