import enum
from datetime import datetime, date
from sqlalchemy import Column, String, Numeric, Integer, Date, Enum, ForeignKey, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
import uuid

from app.db.base import Base


class TaskPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class TaskStatus(str, enum.Enum):
    TODO = "todo"
    IN_PROGRESS = "in-progress"
    DONE = "done"
    CANCELLED = "cancelled"


class MonthlyPlan(Base):
    __tablename__ = "monthly_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    yearly_goal_id = Column(UUID(as_uuid=True), ForeignKey("yearly_goals.id", ondelete="SET NULL"))
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    title = Column(String(200))
    focus_areas = Column(ARRAY(String), default=list)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="monthly_plans")
    yearly_goal = relationship("YearlyGoal", back_populates="monthly_plans")
    monthly_tasks = relationship("MonthlyTask", back_populates="monthly_plan", cascade="all, delete-orphan")
    daily_plans = relationship("DailyPlan", back_populates="monthly_plan", cascade="all, delete-orphan")

    @property
    def total_tasks(self) -> int:
        return len(self.monthly_tasks)

    @property
    def completed_tasks(self) -> int:
        return len([task for task in self.monthly_tasks if task.status == TaskStatus.DONE])

    @property
    def completion_rate(self) -> float:
        if self.total_tasks == 0:
            return 0.0
        return round(self.completed_tasks / self.total_tasks * 100, 2)

    def __repr__(self):
        return f"<MonthlyPlan {self.year}-{self.month}: {self.title}>"


class MonthlyTask(Base):
    __tablename__ = "monthly_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    monthly_plan_id = Column(UUID(as_uuid=True), ForeignKey("monthly_plans.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    priority = Column(Enum(TaskPriority, values_callable=lambda x: [e.value for e in x]), default=TaskPriority.MEDIUM)
    status = Column(Enum(TaskStatus, values_callable=lambda x: [e.value for e in x]), default=TaskStatus.TODO)
    due_date = Column(Date)
    estimated_hours = Column(Numeric(5, 2))
    actual_hours = Column(Numeric(5, 2), default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    monthly_plan = relationship("MonthlyPlan", back_populates="monthly_tasks")

    def __repr__(self):
        return f"<MonthlyTask {self.title} - {self.status}>"
